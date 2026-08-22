import { z } from "zod";
import { Prisma } from "@/src/generated/prisma/client";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

// One ordered curriculum entry referencing an existing unit / quiz / assignment.
const itemInput = z.object({
  kind: z.enum(["UNIT", "QUIZ", "ASSIGNMENT"]),
  refId: z.string().min(1),
});

const fields = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200),
  order: z.coerce.number().int().min(0),
  parentType: z.enum(["course", "batch"]),
  parentId: z.string().min(1, "Choose a course or batch."),
  items: z.array(itemInput).default([]),
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

type ItemInput = z.infer<typeof itemInput>;

/** Fail if any referenced unit/quiz/assignment is already used by another section. */
async function findConflict(items: ItemInput[], currentSectionId: string | null) {
  const unitIds = items.filter((i) => i.kind === "UNIT").map((i) => i.refId);
  const quizIds = items.filter((i) => i.kind === "QUIZ").map((i) => i.refId);
  const assignmentIds = items.filter((i) => i.kind === "ASSIGNMENT").map((i) => i.refId);

  const clash = await prisma.sectionItem.findFirst({
    where: {
      sectionId: currentSectionId ? { not: currentSectionId } : undefined,
      OR: [
        unitIds.length ? { unitId: { in: unitIds } } : undefined,
        quizIds.length ? { quizId: { in: quizIds } } : undefined,
        assignmentIds.length ? { assignmentId: { in: assignmentIds } } : undefined,
      ].filter(Boolean) as Prisma.SectionItemWhereInput[],
    },
    select: { kind: true },
  });
  return clash?.kind ?? null;
}

/** Wipe the section's items, (de)tach unit ownership, then recreate in order. */
async function rebuildItems(
  tx: Prisma.TransactionClient,
  sectionId: string,
  items: ItemInput[]
) {
  const unitRefIds = items.filter((i) => i.kind === "UNIT").map((i) => i.refId);

  await tx.sectionItem.deleteMany({ where: { sectionId } });
  // Detach units that used to live here but were dropped from the curriculum.
  await tx.unit.updateMany({
    where: { sectionId, id: { notIn: unitRefIds.length ? unitRefIds : ["__none__"] } },
    data: { sectionId: null },
  });

  for (const [idx, item] of items.entries()) {
    if (item.kind === "UNIT") {
      await tx.unit.update({ where: { id: item.refId }, data: { sectionId, order: idx } });
      await tx.sectionItem.create({
        data: { sectionId, order: idx, kind: "UNIT", unitId: item.refId },
      });
    } else if (item.kind === "QUIZ") {
      await tx.sectionItem.create({
        data: { sectionId, order: idx, kind: "QUIZ", quizId: item.refId },
      });
    } else {
      await tx.sectionItem.create({
        data: { sectionId, order: idx, kind: "ASSIGNMENT", assignmentId: item.refId },
      });
    }
  }
}

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.action === "delete") {
    await prisma.section.delete({ where: { id: data.id } });
    return ok({ deleted: true });
  }

  const currentId = data.action === "update" ? data.id : null;
  const conflict = await findConflict(data.items, currentId);
  if (conflict) {
    return fail(`A ${conflict.toLowerCase()} in this list is already attached to another section.`);
  }

  const payload = {
    title: data.title,
    order: data.order,
    courseId: data.parentType === "course" ? data.parentId : null,
    batchId: data.parentType === "batch" ? data.parentId : null,
  };

  const section = await prisma.$transaction(async (tx) => {
    const s =
      data.action === "create"
        ? await tx.section.create({ data: payload })
        : await tx.section.update({ where: { id: data.id }, data: payload });
    await rebuildItems(tx, s.id, data.items);
    return s;
  });

  return ok({ section });
});
