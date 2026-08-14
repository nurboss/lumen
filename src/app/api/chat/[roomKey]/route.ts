import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ roomKey: string }> }) => {
  await requireUser();
  const { roomKey } = await ctx.params;

  const messages = await prisma.chatMessage.findMany({
    where: { roomKey: decodeURIComponent(roomKey) },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { sender: { select: { fullName: true } } },
  });

  return ok({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.senderId,
      senderName: m.sender.fullName,
      createdAt: m.createdAt,
    })),
  });
});
