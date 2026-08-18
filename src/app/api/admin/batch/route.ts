import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const DAYS = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"] as const;

const fields = z.object({
  courseId: z.string().min(1, "Choose a course."),
  name: z.string().trim().max(200).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  scheduleDays: z.array(z.enum(DAYS)).optional(),
  scheduleTime: z.string().trim().max(20).optional().or(z.literal("")),
  seats: z.coerce.number().int().min(0).optional(),
  dummyParticipants: z.coerce.number().int().min(0),
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.action === "delete") {
    await prisma.batch.update({ where: { id: data.id }, data: { deletedAt: new Date() } });
    return ok({ deleted: true });
  }

  const course = await prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true } });
  if (!course) return fail("Course not found.");

  const payload = {
    courseId: data.courseId,
    name: data.name || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    scheduleDays: data.scheduleDays ?? [],
    scheduleTime: data.scheduleTime || null,
    seats: data.seats ?? null,
    dummyParticipants: data.dummyParticipants,
  };

  if (data.action === "create") {
    const batch = await prisma.batch.create({ data: { ...payload, createdById: user.id } });
    return ok({ batch });
  }

  const batch = await prisma.batch.update({ where: { id: data.id }, data: payload });
  return ok({ batch });
});
