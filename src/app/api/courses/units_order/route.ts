import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assertCourseManageable, sectionCourseId } from "@/lib/course-access";
import prisma from "@/lib/prisma";

const schema = z.object({
  sectionId: z.string().min(1),
  orderedUnitIds: z.array(z.string().min(1)),
});

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR", "AGENT");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { sectionId, orderedUnitIds } = parsed.data;

  await assertCourseManageable(await sectionCourseId(sectionId), user);

  // Confirm every unit belongs to this section, then persist the new order.
  const units = await prisma.unit.findMany({
    where: { sectionId },
    select: { id: true },
  });
  const valid = new Set(units.map((u) => u.id));
  if (!orderedUnitIds.every((id) => valid.has(id)) || orderedUnitIds.length !== units.length) {
    return fail("Order list does not match the section's units.");
  }

  await prisma.$transaction(
    orderedUnitIds.map((id, index) =>
      prisma.unit.update({ where: { id }, data: { order: index } })
    )
  );
  return ok({ reordered: true });
});
