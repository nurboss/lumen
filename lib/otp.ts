import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { otpEmail } from "@/lib/email/templates";

export type OtpPurpose = "REGISTER" | "RESET";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/** Generate + persist a hashed OTP for an identifier (email or phone). */
export async function issueOtp(
  identifier: string,
  purpose: OtpPurpose
): Promise<{ code: string } | { error: string }> {
  // Cooldown: block if a fresh token was issued very recently.
  const recent = await prisma.otpToken.findFirst({
    where: { identifier, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (
    recent &&
    Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000
  ) {
    return { error: "Please wait before requesting another code." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Invalidate previous unconsumed tokens for this identifier+purpose.
  await prisma.otpToken.updateMany({
    where: { identifier, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.otpToken.create({
    data: { identifier, purpose, codeHash, expiresAt },
  });

  // Deliver the code. If email delivery fails, surface it — otherwise the user
  // is stuck on a "code sent" screen for a code that never arrives.
  const delivered = await sendOtp(identifier, code, purpose);
  if (!delivered.ok) {
    return { error: delivered.error };
  }

  return { code };
}

/**
 * Verify an OTP code.
 * @param consume when true, marks the token consumed (final step); when false,
 *   only checks validity (peek) so a later step can consume it.
 */
export async function verifyOtp(
  identifier: string,
  purpose: OtpPurpose,
  code: string,
  consume = false
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = await prisma.otpToken.findFirst({
    where: { identifier, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!token) return { ok: false, error: "No active code. Request a new one." };
  if (token.expiresAt < new Date())
    return { ok: false, error: "Code expired. Request a new one." };
  if (token.attempts >= MAX_ATTEMPTS)
    return { ok: false, error: "Too many attempts. Request a new code." };

  const match = await bcrypt.compare(code, token.codeHash);
  if (!match) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Incorrect code." };
  }

  if (consume) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });
  }
  return { ok: true };
}

/**
 * Deliver an OTP. Email identifiers go out via Resend; phone identifiers fall
 * back to the console stub until an SMS provider is wired up.
 */
async function sendOtp(
  identifier: string,
  code: string,
  purpose: OtpPurpose
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (/\S+@\S+\.\S+/.test(identifier)) {
    const res = await sendEmail(identifier, otpEmail(code, purpose));
    if (!res.ok) {
      return { ok: false, error: "We couldn't send the code. Check the email address and try again." };
    }
    return { ok: true };
  }
  console.log(`[otp] (${purpose}) code for ${identifier}: ${code}`);
  return { ok: true };
}
