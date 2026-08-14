import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { CategoryManager } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";

export default async function ManageCategoryPage() {
  const categories = await prisma.courseCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });

  return (
    <div>
      <DashboardHeading title="Course categories" subtitle="Organize the catalog." />
      <CategoryManager categories={categories} />
    </div>
  );
}
