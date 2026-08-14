import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({ name: z.string().trim().min(2).max(100), iconUrl: z.string().optional() });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN", "INSTRUCTOR", "AGENT");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, iconUrl } = parsed.data;

  let slug = slugify(name);
  if (await prisma.courseCategory.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const category = await prisma.courseCategory.create({ data: { name, slug, iconUrl: iconUrl || null } });
  return ok({ category });
});
