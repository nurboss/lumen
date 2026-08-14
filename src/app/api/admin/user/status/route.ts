import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]),
});

export const POST = handler(async (req: Request) => {
  const admin = await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { userId, status } = parsed.data;

  if (userId === admin.id) return fail("You cannot change your own status.");

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      // Approving an instructor/agent also flips their profile approval.
      ...(status === "ACTIVE"
        ? { instructorProfile: { update: { approved: true } } }
        : {}),
    },
    select: { id: true, status: true },
  }).catch(async () => {
    // User may not have an instructorProfile to update — retry without nested write.
    return prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, status: true },
    });
  });

  if (status === "ACTIVE") {
    await prisma.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: "Account approved",
        body: "Your account has been approved. You can now log in.",
      },
    }).catch(() => {});
  }

  return ok({ user });
});
