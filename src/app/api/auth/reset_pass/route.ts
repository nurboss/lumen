import { ok, fail, handler } from "@/lib/api";
import { verifyOtp } from "@/lib/otp";
import { resetPassSchema, isEmail } from "@/lib/validators/auth";
import { hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const parsed = resetPassSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { identifier, code, password } = parsed.data;

  // Final OTP check (consumes the token).
  const otp = await verifyOtp(identifier, "RESET", code, true);
  if (!otp.ok) return fail(otp.error);

  const user = await prisma.user.findFirst({
    where: isEmail(identifier)
      ? { email: identifier }
      : { phoneNumber: identifier },
  });
  if (!user) return fail("Account not found.", 404);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) },
  });

  // Invalidate all existing sessions after a password reset.
  await prisma.session.deleteMany({ where: { userId: user.id } });

  return ok({ reset: true });
});
