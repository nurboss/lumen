import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream of the user's unread notification count.
 * Polls the DB on an interval (works without a separate broker). Clients
 * reconnect automatically on disconnect.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let closed = false;
  let interval: ReturnType<typeof setInterval> | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const tick = async () => {
        if (closed) return;
        const unread = await prisma.notification.count({
          where: { userId: user.id, read: false },
        });
        send("unread", { unread });
      };

      await tick();
      interval = setInterval(tick, 8000);
      // Keep-alive comment to prevent proxies from closing the connection.
      keepAlive = setInterval(() => {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(`: keep-alive\n\n`));
          } catch {
            closed = true;
          }
        }
      }, 25000);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
