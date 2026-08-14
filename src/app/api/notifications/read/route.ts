import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({ id: z.string().optional() });

// Mark one (id) or all notifications read for the current user.
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  await prisma.notification.updateMany({
    where: { userId: user.id, ...(parsed.data.id ? { id: parsed.data.id } : {}) },
    data: { read: true },
  });
  return ok({ updated: true });
});
