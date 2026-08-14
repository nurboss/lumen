import { ok, fail, handler } from "@/lib/api";
import { verifyOtp } from "@/lib/otp";
import { registerSchema, isEmail } from "@/lib/validators/auth";
import { hashPassword, createSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { fullName, identifier, code, password, sector } = parsed.data;
  const email = isEmail(identifier) ? identifier : null;
  const phoneNumber = isEmail(identifier) ? null : identifier;

  // Final OTP check (consumes the token).
  const otp = await verifyOtp(identifier, "REGISTER", code, true);
  if (!otp.ok) return fail(otp.error);

  const existing = await prisma.user.findFirst({
    where: email ? { email } : { phoneNumber },
  });
  if (existing) return fail("An account with this identifier already exists.");

  // Instructor/Agent registrations await admin approval; students are active.
  const status = sector === "STUDENT" ? "ACTIVE" : "PENDING";

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      phoneNumber,
      passwordHash: await hashPassword(password),
      role: sector,
      status,
      emailVerifiedAt: email ? new Date() : null,
      phoneVerifiedAt: phoneNumber ? new Date() : null,
      wallet: { create: { balance: 0 } },
      ...(sector !== "STUDENT"
        ? { instructorProfile: { create: { approved: false } } }
        : {}),
    },
  });

  // Only log in immediately if the account is active (students).
  if (status === "ACTIVE") {
    await createSession(user.id);
  }

  return ok({
    id: user.id,
    role: user.role,
    status: user.status,
    needsApproval: status === "PENDING",
  });
});
