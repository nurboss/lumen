import Link from "next/link";
import { Clock, Coins, Wallet } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireDashboard } from "@/lib/dashboard";
import { formatBdt, formatDate } from "@/lib/format";
import { DashboardHeading, StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WithdrawalForm } from "@/components/wallet/withdrawal-form";

export const dynamic = "force-dynamic";

export default async function InstructorCommissionPage() {
  const user = await requireDashboard(["INSTRUCTOR"]);
  const [wallet, earned, pending, commissions] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id }, select: { balance: true } }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "COMMISSION", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "WITHDRAWAL", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "COMMISSION" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: { id: true, amount: true, status: true, createdAt: true, reference: true },
    }),
  ]);
  const pendingAmount = pending._sum.amount ?? 0;
  const availableBalance = Math.max(0, (wallet?.balance ?? 0) - pendingAmount);

  return (
    <div className="space-y-8">
      <div>
        <DashboardHeading title="Commission" subtitle="Track your credited earnings and request withdrawals." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total commission earned" value={formatBdt(earned._sum.amount ?? 0)} icon={Coins} />
          <StatCard label="Available wallet balance" value={formatBdt(availableBalance)} icon={Wallet} />
          <StatCard label="Pending withdrawals" value={formatBdt(pendingAmount)} icon={Clock} />
        </div>
      </div>

      <section aria-labelledby="withdrawal-heading">
        <h2 id="withdrawal-heading" className="mb-3 font-heading text-xl font-bold">Request withdrawal</h2>
        <Card>
          <CardContent className="p-5">
            {availableBalance > 0 ? <WithdrawalForm maxPaisa={availableBalance} /> : (
              <p className="text-sm text-muted-foreground">You don&apos;t have any available balance to withdraw right now.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="commission-history-heading">
        <h2 id="commission-history-heading" className="mb-3 font-heading text-xl font-bold">Recent commissions</h2>
        {commissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No commission records yet.</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">Your latest {commissions.length} commission records.</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="text-muted-foreground">{formatDate(commission.createdAt)}</TableCell>
                      <TableCell>{formatBdt(commission.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={commission.status === "FAILED" || commission.status === "REJECTED" ? "destructive" : "secondary"}>
                          {commission.status.charAt(0) + commission.status.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 break-all whitespace-normal font-mono text-xs text-muted-foreground">{commission.reference || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        <Link href="/instructor/payment" className="mt-4 inline-block text-sm text-primary hover:underline">View all payments and withdrawals</Link>
      </section>
    </div>
  );
}
