import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { isEmail } from "@/lib/validators/auth";
import prisma from "@/lib/prisma";

const schema = z.object({ identifier: z.string().trim().min(3) });

export const POST = handler(async (req: Request) => {
  const parent = await requireRole("PARENT");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { identifier } = parsed.data;

  const student = await prisma.user.findFirst({
    where: {
      role: "STUDENT",
      deletedAt: null,
      ...(isEmail(identifier) ? { email: identifier } : { phoneNumber: identifier }),
    },
    select: { id: true, fullName: true },
  });
  if (!student) return fail("No student found with that email/phone.", 404);

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    create: { parentId: parent.id, studentId: student.id },
    update: {},
  });

  return ok({ student: { id: student.id, fullName: student.fullName } });
});
