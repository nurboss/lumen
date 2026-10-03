import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assertContentManageable } from "@/lib/content-access";

const durationUnit = z.enum(["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "YEAR"]);

const fields = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  timeLimit: z.coerce.number().int().min(0).optional(),
  durationUnit: durationUnit.optional(),
  submissionType: z.enum(["TEXT_AREA", "FILE", "BOTH"]),
  attachmentType: z.string().trim().max(200).optional().or(z.literal("")),
  attachmentSizeMb: z.coerce.number().int().min(0).optional(),
  autoEvaluation: z.boolean(),
  maximumMarks: z.coerce.number().int().min(1).max(1000),
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;
  if (data.action !== "create") await assertContentManageable("assignment", data.id, user);

  if (data.action === "delete") {
    await prisma.assignment.delete({ where: { id: data.id } });
    return ok({ deleted: true });
  }

  const payload = {
    title: data.title,
    description: data.description || null,
    timeLimit: data.timeLimit ?? null,
    durationUnit: data.durationUnit ?? null,
    submissionType: data.submissionType,
    attachmentType: data.attachmentType || null,
    attachmentSizeMb: data.attachmentSizeMb ?? null,
    autoEvaluation: data.autoEvaluation,
    maximumMarks: data.maximumMarks,
  };

  if (data.action === "create") {
    const assignment = await prisma.assignment.create({ data: { ...payload, authorId: user.id } });
    return ok({ assignment });
  }

  const assignment = await prisma.assignment.update({ where: { id: data.id }, data: payload });
  return ok({ assignment });
});
