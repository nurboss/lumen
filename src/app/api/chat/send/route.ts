import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({
  roomKey: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { roomKey, body } = parsed.data;

  const message = await prisma.chatMessage.create({
    data: { roomKey, senderId: user.id, body },
    include: { sender: { select: { fullName: true } } },
  });

  return ok({
    message: {
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      senderName: message.sender.fullName,
      createdAt: message.createdAt,
    },
  });
});
