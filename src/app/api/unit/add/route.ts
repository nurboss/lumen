import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assertCourseManageable, sectionCourseId } from "@/lib/course-access";
import prisma from "@/lib/prisma";

const schema = z.object({
  sectionId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  type: z.enum(["VIDEO", "LIVE", "TEXT"]).default("VIDEO"),
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
  const d = parsed.data;

  await assertCourseManageable(await sectionCourseId(d.sectionId), user);

  // New unit goes to the end of the section's curriculum.
  const lastItem = await prisma.sectionItem.findFirst({
    where: { sectionId: d.sectionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (lastItem?.order ?? -1) + 1;

  const unit = await prisma.unit.create({
    data: {
      sectionId: d.sectionId,
      title: d.title,
      type: d.type,
      isFree: d.isFree ?? false,
      publicVideoUrl: d.publicVideoUrl || null,
      storageVideoUrl: d.storageVideoUrl || null,
      attachmentUrl: d.attachmentUrl || null,
      description: d.description || null,
      duration: d.duration ?? null,
      order: nextOrder,
      // Record the matching ordered curriculum entry.
      sectionItem: {
        create: { sectionId: d.sectionId, kind: "UNIT", order: nextOrder },
      },
    },
  });
  return ok({ unit });
});
