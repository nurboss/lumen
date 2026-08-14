import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Admin credits a user's wallet (e.g. referral commission, manual adjustment).
const schema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(), // paisa
  type: z.enum(["COMMISSION", "RECHARGE", "REFUND"]).default("COMMISSION"),
});

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { userId, amount, type } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      create: { userId, balance: amount },
      update: { balance: { increment: amount } },
    });
    await tx.transaction.create({
      data: { userId, type, status: "COMPLETED", amount, gateway: "MANUAL" },
    });
    return wallet;
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "PAYMENT",
      title: "Wallet credited",
      body: `Your wallet was credited.`,
      link: "/student/commission-wallet",
    },
  }).catch(() => {});

  return ok({ balance: result.balance });
});
