import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({
  assignmentId: z.string().min(1),
  batchId: z.string().optional(),
  contentText: z.string().optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { assignmentId, batchId, contentText, fileUrl } = parsed.data;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, submissionType: true },
  });
  if (!assignment) return fail("Assignment not found.", 404);

  if ((assignment.submissionType === "TEXT_AREA" || assignment.submissionType === "BOTH") && !contentText && !fileUrl) {
    return fail("A submission is required.");
  }

  const submission = await prisma.assignmentSubmission.create({
    data: {
      assignmentId,
      userId: user.id,
      batchId: batchId ?? null,
      contentText: contentText || null,
      fileUrl: fileUrl || null,
      status: "SUBMITTED",
    },
  });

  return ok({ submissionId: submission.id });
});
