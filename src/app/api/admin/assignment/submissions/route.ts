import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assertContentManageable } from "@/lib/content-access";

// Lists every submission for one assignment, so a grader can review and mark them.
export const GET = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR", "AGENT");
  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get("assignmentId");
  if (!assignmentId) return fail("assignmentId is required.");
  await assertContentManageable("assignment", assignmentId, user);

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, title: true, maximumMarks: true, submissionType: true },
  });
  if (!assignment) return fail("Assignment not found.", 404);

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      contentText: true,
      fileUrl: true,
      marks: true,
      feedback: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  return ok({ assignment, submissions });
});
