import Link from "next/link";
import { CreditCard } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireDashboard } from "@/lib/dashboard";
import { formatBdt, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import type { Prisma } from "@/src/generated/prisma/client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function InstructorPaymentPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireDashboard(["INSTRUCTOR"]);
  const params = await searchParams;
  const requestedPage = Number(params.page);
  const where: Prisma.TransactionWhereInput = { userId: user.id };
  const total = await prisma.transaction.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      type: true,
      status: true,
      amount: true,
      gateway: true,
      payoutMethod: true,
      reference: true,
      courseId: true,
      createdAt: true,
      enrollments: { select: { course: { select: { title: true } } } },
    },
  });
  const courseIds = [...new Set(transactions.flatMap((transaction) => transaction.courseId ? [transaction.courseId] : []))];
  const courses = courseIds.length > 0 ? await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true },
  }) : [];
  const courseTitles = new Map(courses.map((course) => [course.id, course.title]));

  return (
    <div>
      <DashboardHeading title="Payments" subtitle="Your payments, commissions, and withdrawal history." />
      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You don&apos;t have any transaction records yet.</p>
            <Link href="/course" className={buttonVariants({ size: "sm" })}>Browse courses</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{total} transaction record{total === 1 ? "" : "s"}</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Course / description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const title = (transaction.courseId ? courseTitles.get(transaction.courseId) : undefined)
                    ?? transaction.enrollments[0]?.course.title
                    ?? (transaction.type === "WITHDRAWAL" ? "Wallet withdrawal" : transaction.type === "COMMISSION" ? "Commission earning" : transaction.type === "RECHARGE" ? "Wallet recharge" : "Account transaction");
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-muted-foreground">{formatDate(transaction.createdAt)}</TableCell>
                      <TableCell className="min-w-48 whitespace-normal font-medium">{title}</TableCell>
                      <TableCell>{transaction.type.charAt(0) + transaction.type.slice(1).toLowerCase()}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatBdt(transaction.amount)}</TableCell>
                      <TableCell>{transaction.type === "WITHDRAWAL" && transaction.payoutMethod ? transaction.payoutMethod : transaction.gateway === "AAMARPAY" ? "aamarPay" : transaction.gateway === "WALLET" ? "Wallet" : transaction.gateway === "MANUAL" ? "Manual" : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.status === "FAILED" || transaction.status === "REJECTED" ? "destructive" : "secondary"}>
                          {transaction.status.charAt(0) + transaction.status.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 break-all whitespace-normal font-mono text-xs text-muted-foreground">{transaction.reference || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <nav aria-label="Payment history pages" className="mt-6 flex items-center justify-center gap-3">
              <Link href={`/instructor/payment?page=${page - 1}`} aria-disabled={page === 1} tabIndex={page === 1 ? -1 : undefined} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page === 1 && "pointer-events-none opacity-50")}>Previous</Link>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Link href={`/instructor/payment?page=${page + 1}`} aria-disabled={page === totalPages} tabIndex={page === totalPages ? -1 : undefined} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page === totalPages && "pointer-events-none opacity-50")}>Next</Link>
            </nav>
          )}
        </>
      )}
      <Link href="/instructor/commission" className="mt-6 inline-block text-sm text-primary hover:underline">View commission and request withdrawals</Link>
    </div>
  );
}

