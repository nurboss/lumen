import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({
  amount: z.number().int().positive(), // paisa
  payoutMethod: z.string().min(2).max(40),
  payoutNumber: z.string().min(3).max(40),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { amount, payoutMethod, payoutNumber } = parsed.data;

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  const available = wallet?.balance ?? 0;

  // Account for any already-pending withdrawals.
  const pending = await prisma.transaction.aggregate({
    where: { userId: user.id, type: "WITHDRAWAL", status: "PENDING" },
    _sum: { amount: true },
  });
  const committed = pending._sum.amount ?? 0;

  if (amount > available - committed) {
    return fail("Insufficient available balance.");
  }

  const txn = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "WITHDRAWAL",
      status: "PENDING",
      amount,
      gateway: "MANUAL",
      payoutMethod,
      payoutNumber,
    },
  });

  return ok({ transactionId: txn.id });
});
