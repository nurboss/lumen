import { ok, fail, handler } from "@/lib/api";
import { issueOtp } from "@/lib/otp";
import { sendOtpSchema, isEmail } from "@/lib/validators/auth";
import prisma from "@/lib/prisma";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { identifier } = parsed.data;
  const user = await prisma.user.findFirst({
    where: isEmail(identifier)
      ? { email: identifier }
      : { phoneNumber: identifier },
  });

  // Always respond OK to avoid account enumeration; only send if user exists.
  if (user && !user.deletedAt) {
    const result = await issueOtp(identifier, "RESET");
    if ("error" in result) return fail(result.error, 429);
  }

  return ok({ sent: true });
});
