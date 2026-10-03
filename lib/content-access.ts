import "server-only";
import prisma from "@/lib/prisma";
import { AuthError, type SessionUser } from "@/lib/auth";
import type { Prisma } from "@/src/generated/prisma/client";

export async function assertContentManageable(kind: "quiz" | "assignment" | "question", id: string, user: SessionUser) {
  if (user.role === "ADMIN") return;
  const record = kind === "quiz"
    ? await prisma.quiz.findUnique({ where: { id }, select: { authorId: true } })
    : kind === "assignment"
      ? await prisma.assignment.findUnique({ where: { id }, select: { authorId: true } })
      : await prisma.question.findUnique({ where: { id }, select: { authorId: true } });
  if (!record) throw new AuthError("Content not found.", 404);
  if (record.authorId !== user.id) throw new AuthError("Forbidden", 403);
}

export async function assertCurriculumManageable(
  sections: { items: ({ kind: "unit" } | { kind: "quiz" | "assignment"; refId: string })[] }[],
  user: SessionUser,
) {
  if (user.role === "ADMIN") return;
  const quizIds = [...new Set(sections.flatMap((section) => section.items.flatMap((item) => item.kind === "quiz" ? [item.refId] : [])))];
  const assignmentIds = [...new Set(sections.flatMap((section) => section.items.flatMap((item) => item.kind === "assignment" ? [item.refId] : [])))];
  const [quizzes, assignments] = await Promise.all([
    quizIds.length ? prisma.quiz.count({ where: { id: { in: quizIds }, authorId: user.id } }) : 0,
    assignmentIds.length ? prisma.assignment.count({ where: { id: { in: assignmentIds }, authorId: user.id } }) : 0,
  ]);
  if (quizzes !== quizIds.length || assignments !== assignmentIds.length) {
    throw new AuthError("You can only add your own quizzes and assignments.", 403);
  }
}

export function instructorUnitWhere(authorId: string): Prisma.UnitWhereInput {
  return {
    section: {
      OR: [
        { course: { authorId, deletedAt: null } },
        { batch: { deletedAt: null, course: { authorId, deletedAt: null } } },
      ],
    },
  };
}
