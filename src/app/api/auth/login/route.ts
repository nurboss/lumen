import { ok, fail, handler } from "@/lib/api";
import { loginSchema, isEmail } from "@/lib/validators/auth";
import { verifyPassword, createSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { identifier, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: isEmail(identifier)
      ? { email: identifier }
      : { phoneNumber: identifier },
  });

  // Uniform error to avoid account enumeration.
  if (!user || !user.passwordHash || user.deletedAt) {
    return fail("Invalid credentials.", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return fail("Invalid credentials.", 401);

  if (user.status === "PENDING") {
    return fail("Your account is pending admin approval.", 403);
  }
  if (user.status === "SUSPENDED") {
    return fail("Your account has been suspended.", 403);
  }

  await createSession(user.id);
  return ok({ id: user.id, role: user.role });
});
