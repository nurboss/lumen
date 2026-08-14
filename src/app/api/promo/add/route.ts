import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({
  code: z.string().trim().min(3).max(40),
  discountType: z.enum(["PERCENT", "FLAT"]),
  value: z.number().int().positive(), // percent 1-100 or flat paisa
  usageLimit: z.number().int().positive().optional(),
  validTo: z.string().datetime().optional(),
});

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { code, discountType, value, usageLimit, validTo } = parsed.data;

  if (discountType === "PERCENT" && value > 100) return fail("Percent discount cannot exceed 100.");

  const upper = code.toUpperCase();
  if (await prisma.promo.findUnique({ where: { code: upper } })) {
    return fail("A promo with this code already exists.");
  }

  const promo = await prisma.promo.create({
    data: {
      code: upper,
      discountType,
      value,
      usageLimit: usageLimit ?? null,
      validTo: validTo ? new Date(validTo) : null,
    },
  });
  return ok({ promo });
});
