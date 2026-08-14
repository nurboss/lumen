import { Wallet as WalletIcon } from "lucide-react";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
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
import { WithdrawalForm } from "@/components/wallet/withdrawal-form";

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  COMPLETED: "default",
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  FAILED: "destructive",
};

export async function WalletView({ userId }: { userId: string }) {
  const [wallet, transactions] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <WalletIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="eyebrow text-[0.65rem]">Available balance</p>
            <p className="font-heading text-3xl font-bold text-foreground">{formatBdt(balance)}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-foreground">Request withdrawal</h2>
        <WithdrawalForm maxPaisa={balance} />
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-foreground">Transaction history</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell>{formatBdt(t.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[t.status] ?? "secondary"}>{t.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
