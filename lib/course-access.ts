import "server-only";
import prisma from "@/lib/prisma";
import { AuthError, type SessionUser } from "@/lib/auth";

/**
 * Ensures the user may manage the given course:
 *  - ADMIN can manage any course.
 *  - INSTRUCTOR/AGENT can manage only courses they authored.
 * Throws AuthError otherwise. Returns the course id.
 */
export async function assertCourseManageable(
  courseId: string,
  user: SessionUser
): Promise<void> {
  if (user.role === "ADMIN") {
    const exists = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!exists) throw new AuthError("Course not found", 404);
    return;
  }

  if (user.role === "INSTRUCTOR" || user.role === "AGENT") {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { authorId: true },
    });
    if (!course) throw new AuthError("Course not found", 404);
    if (course.authorId !== user.id) throw new AuthError("Forbidden", 403);
    return;
  }

  throw new AuthError("Forbidden", 403);
}

/** Resolve a section's course id (or throw). */
export async function sectionCourseId(sectionId: string): Promise<string> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { courseId: true },
  });
  if (!section?.courseId) throw new AuthError("Section not found", 404);
  return section.courseId;
}

/** Resolve a unit's course id (or throw). */
export async function unitCourseId(unitId: string): Promise<string> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { section: { select: { courseId: true } } },
  });
  if (!unit?.section.courseId) throw new AuthError("Unit not found", 404);
  return unit.section.courseId;
}
