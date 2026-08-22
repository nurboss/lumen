import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const durationUnit = z.enum(["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "YEAR"]);

const fields = z.object({
  sectionId: z.string().optional().or(z.literal("")),
  title: z.string().trim().min(1, "Enter a title.").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  order: z.coerce.number().int().min(0),
  type: z.enum(["VIDEO", "LIVE", "TEXT"]),
  code: z.string().trim().max(60).optional().or(z.literal("")),
  isFree: z.boolean(),
  duration: z.coerce.number().int().min(0).optional(),
  durationUnit: durationUnit.optional(),
  marks: z.coerce.number().int().min(0).optional(),
  publicVideoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  storageVideoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  attachmentUrl: z.string().trim().max(500).optional().or(z.literal("")),
  offlineText: z.string().trim().max(5000).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  startTime: z.string().trim().max(20).optional().or(z.literal("")),
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.action === "delete") {
    await prisma.unit.delete({ where: { id: data.id } });
    return ok({ deleted: true });
  }

  if (data.sectionId) {
    const section = await prisma.section.findUnique({ where: { id: data.sectionId }, select: { id: true } });
    if (!section) return fail("Section not found.");
  }

  const payload = {
    sectionId: data.sectionId || null,
    title: data.title,
    description: data.description || null,
    order: data.order,
    type: data.type,
    code: data.code || null,
    isFree: data.isFree,
    duration: data.duration ?? null,
    durationUnit: data.durationUnit ?? null,
    marks: data.type === "VIDEO" || data.type === "LIVE" ? data.marks ?? null : null,
    publicVideoUrl: data.type === "VIDEO" ? data.publicVideoUrl || null : null,
    storageVideoUrl: data.type === "LIVE" ? data.storageVideoUrl || null : null,
    attachmentUrl: data.type === "LIVE" ? data.attachmentUrl || null : null,
    offlineText: data.type === "TEXT" ? data.offlineText || null : null,
    startDate: data.type === "LIVE" && data.startDate ? new Date(data.startDate) : null,
    startTime: data.type === "LIVE" ? data.startTime || null : null,
  };

  if (data.action === "create") {
    const unit = await prisma.unit.create({ data: payload });
    return ok({ unit });
  }

  const unit = await prisma.unit.update({ where: { id: data.id }, data: payload });
  return ok({ unit });
});
