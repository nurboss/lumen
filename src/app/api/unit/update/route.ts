import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assertCourseManageable, unitCourseId } from "@/lib/course-access";
import prisma from "@/lib/prisma";

const schema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  isFree: z.boolean().optional(),
  publicVideoUrl: z.string().url().optional().or(z.literal("")),
  storageVideoUrl: z.string().url().optional().or(z.literal("")),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  duration: z.number().int().min(0).optional(),
});

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR", "AGENT");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { id, ...rest } = parsed.data;

  await assertCourseManageable(await unitCourseId(id), user);

  const unit = await prisma.unit.update({
    where: { id },
    data: {
      ...(rest.title !== undefined ? { title: rest.title } : {}),
      ...(rest.isFree !== undefined ? { isFree: rest.isFree } : {}),
      ...(rest.publicVideoUrl !== undefined ? { publicVideoUrl: rest.publicVideoUrl || null } : {}),
      ...(rest.storageVideoUrl !== undefined ? { storageVideoUrl: rest.storageVideoUrl || null } : {}),
      ...(rest.attachmentUrl !== undefined ? { attachmentUrl: rest.attachmentUrl || null } : {}),
      ...(rest.description !== undefined ? { description: rest.description || null } : {}),
      ...(rest.duration !== undefined ? { duration: rest.duration } : {}),
    },
  });
  return ok({ unit });
});
