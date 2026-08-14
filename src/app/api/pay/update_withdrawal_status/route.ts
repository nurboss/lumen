import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({
  transactionId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const POST = handler(async (req: Request) => {
  const admin = await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { transactionId, status } = parsed.data;

  const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!txn || txn.type !== "WITHDRAWAL") return fail("Withdrawal not found.", 404);
  if (txn.status !== "PENDING") return fail("This withdrawal is already resolved.");

  if (status === "REJECTED") {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "REJECTED", approvedById: admin.id },
    });
    return ok({ status: "REJECTED" });
  }

  // APPROVED → deduct from wallet atomically (settlement happens off-platform).
  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: txn.userId } });
    if (!wallet || wallet.balance < txn.amount) {
      throw new Error("Insufficient wallet balance to approve.");
    }
    await tx.wallet.update({
      where: { userId: txn.userId },
      data: { balance: { decrement: txn.amount } },
    });
    await tx.transaction.update({
      where: { id: transactionId },
      data: { status: "COMPLETED", approvedById: admin.id },
    });
  });

  await prisma.notification.create({
    data: {
      userId: txn.userId,
      type: "PAYMENT",
      title: "Withdrawal approved",
      body: "Your withdrawal request has been approved.",
    },
  }).catch(() => {});

  return ok({ status: "COMPLETED" });
});
