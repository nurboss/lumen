import { ok, fail, handler } from "@/lib/api";
import { verifyOtp } from "@/lib/otp";
import { verifyOtpSchema } from "@/lib/validators/auth";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { identifier, code } = parsed.data;
  // Peek verify (does not consume) so /register can consume it as the final step.
  const result = await verifyOtp(identifier, "REGISTER", code, false);
  if (!result.ok) return fail(result.error);

  return ok({ verified: true });
});
