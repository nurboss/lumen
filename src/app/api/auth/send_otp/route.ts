import { ok, fail, handler } from "@/lib/api";
import { issueOtp } from "@/lib/otp";
import { sendOtpSchema } from "@/lib/validators/auth";
import prisma from "@/lib/prisma";
import { isEmail } from "@/lib/validators/auth";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { identifier } = parsed.data;

  // Don't allow registering an already-used identifier.
  const existing = await prisma.user.findFirst({
    where: isEmail(identifier)
      ? { email: identifier }
      : { phoneNumber: identifier },
  });
  if (existing) return fail("An account with this identifier already exists.");

  const result = await issueOtp(identifier, "REGISTER");
  if ("error" in result) return fail(result.error, 429);

  return ok({ sent: true });
});
