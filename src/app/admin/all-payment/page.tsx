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
import { formatBdt, formatDate } from "@/lib/format";
import { WithdrawalActions } from "@/components/admin/withdrawal-actions";

export const dynamic = "force-dynamic";

export default async function AllPaymentPage() {
  const [pending, recent] = await Promise.all([
    prisma.transaction.findMany({
      where: { type: "WITHDRAWAL", status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { fullName: true } } },
    }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <DashboardHeading title="Withdrawals" subtitle="Approve or reject pending payout requests." />
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending withdrawals.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.user.fullName}</TableCell>
                    <TableCell>{formatBdt(t.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.payoutMethod} · {t.payoutNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <WithdrawalActions transactionId={t.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-foreground">All transactions</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                  <TableCell>{t.user.fullName}</TableCell>
                  <TableCell>{t.type}</TableCell>
                  <TableCell>{formatBdt(t.amount)}</TableCell>
                  <TableCell><Badge variant="secondary">{t.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
