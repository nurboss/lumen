import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { CurriculumBuilder, type BuilderCourse } from "@/components/curriculum-builder";

export const dynamic = "force-dynamic";

export default async function ManageUnitPage() {
  const user = await getSession();

  const courses = await prisma.course.findMany({
    where: { authorId: user!.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          units: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, isFree: true, order: true, publicVideoUrl: true },
          },
        },
      },
    },
  });

  return (
    <div>
      <DashboardHeading title="Curriculum" subtitle="Manage sections and lessons for your courses." />
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You have no courses yet. Create one first.
        </p>
      ) : (
        <CurriculumBuilder courses={courses as BuilderCourse[]} />
      )}
    </div>
  );
}
