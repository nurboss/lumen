import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import prisma from "@/lib/prisma";

const schema = z.object({ code: z.string().trim().min(1), courseId: z.string().optional() });

export const POST = handler(async (req: Request) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { code, courseId } = parsed.data;

  const promo = await prisma.promo.findUnique({ where: { code: code.toUpperCase() } });
  if (!promo || !promo.active) return fail("Invalid or inactive promo code.", 404);

  const now = new Date();
  if (promo.validFrom && promo.validFrom > now) return fail("This promo is not active yet.");
  if (promo.validTo && promo.validTo < now) return fail("This promo has expired.");
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    return fail("This promo has reached its usage limit.");
  }
  if (promo.courseIds.length > 0 && courseId && !promo.courseIds.includes(courseId)) {
    return fail("This promo does not apply to this course.");
  }

  return ok({
    valid: true,
    discountType: promo.discountType,
    value: promo.value, // percent (0-100) or flat paisa
  });
});
