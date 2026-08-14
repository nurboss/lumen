import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({
  id: z.string().min(1),
  marks: z.number().int().min(0).optional(),
  feedback: z.string().optional(),
  status: z.enum(["SUBMITTED", "EVALUATED", "RESUBMIT"]).optional(),
});

export const POST = handler(async (req: Request) => {
  const grader = await requireRole("ADMIN", "INSTRUCTOR", "AGENT");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { id, marks, feedback, status } = parsed.data;

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id },
    select: { id: true, assignment: { select: { authorId: true, maximumMarks: true } }, userId: true },
  });
  if (!submission) return fail("Submission not found.", 404);

  // Only the assignment's author (or an admin) may grade.
  if (grader.role !== "ADMIN" && submission.assignment.authorId !== grader.id) {
    return fail("Forbidden", 403);
  }
  if (marks !== undefined && marks > submission.assignment.maximumMarks) {
    return fail(`Marks cannot exceed ${submission.assignment.maximumMarks}.`);
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id },
    data: {
      ...(marks !== undefined ? { marks } : {}),
      ...(feedback !== undefined ? { feedback } : {}),
      status: status ?? "EVALUATED",
      evaluatedById: grader.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: submission.userId,
      type: "GRADING",
      title: "Assignment graded",
      body: marks !== undefined ? `You scored ${marks} marks.` : "Your assignment was reviewed.",
    },
  });

  return ok({ submission: updated });
});
