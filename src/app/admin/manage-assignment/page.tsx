import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { AssignmentManager } from "@/components/admin/assignment-manager";

export const dynamic = "force-dynamic";

export default async function ManageAssignmentPage() {
  const assignments = await prisma.assignment.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <div>
      <DashboardHeading title="Assignments" subtitle="Create assignments for your courses." />
      <AssignmentManager assignments={JSON.parse(JSON.stringify(assignments))} />
    </div>
  );
}
