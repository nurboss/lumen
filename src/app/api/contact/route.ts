import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import prisma from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(4000),
});

export const POST = handler(async (req: Request) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, email, phone, subject, message } = parsed.data;

  await prisma.contactMessage.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      subject: subject || null,
      message,
    },
  });

  return ok({ received: true });
});
