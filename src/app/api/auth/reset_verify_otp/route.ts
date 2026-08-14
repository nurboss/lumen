import { ok, fail, handler } from "@/lib/api";
import { verifyOtp } from "@/lib/otp";
import { verifyOtpSchema } from "@/lib/validators/auth";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { identifier, code } = parsed.data;
  const result = await verifyOtp(identifier, "RESET", code, false);
  if (!result.ok) return fail(result.error);

  return ok({ verified: true });
});
