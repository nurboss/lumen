import Link from "next/link";
import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBdt, effectivePrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ManageCoursePage() {
  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      author: { select: { fullName: true } },
      _count: { select: { enrollments: true } },
    },
  });

  return (
    <div>
      <DashboardHeading title="Courses" subtitle="All courses on the platform." />
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/courseDetails/${c.id}`} className="hover:text-primary">{c.title}</Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.category?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.author?.fullName ?? "—"}</TableCell>
                <TableCell>{c.isFree ? "Free" : formatBdt(effectivePrice(c))}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "PUBLISHED" ? "default" : "secondary"}>{c.status}</Badge>
                </TableCell>
                <TableCell>{c._count.enrollments}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
