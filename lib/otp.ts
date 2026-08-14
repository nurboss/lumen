import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

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

  // Pluggable delivery — for now, log to the server console.
  await sendOtp(identifier, code, purpose);

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

/** Delivery stub. Swap for email/SMS provider later. */
async function sendOtp(identifier: string, code: string, purpose: OtpPurpose) {
  console.log(`[otp] (${purpose}) code for ${identifier}: ${code}`);
}
