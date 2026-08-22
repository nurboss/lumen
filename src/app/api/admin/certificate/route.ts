import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

// A certificate template's design/text, stored on CertificateTemplate.layout (Json).
// Body supports placeholders: {name} {course} {code} {region} {date}.
const layout = z.object({
  title: z.string().trim().max(120).default("Certificate of Completion"),
  body: z
    .string()
    .trim()
    .max(1000)
    .default("This is to certify that {name} has successfully completed {course}."),
  signatureName: z.string().trim().max(120).optional().default(""),
  signatureTitle: z.string().trim().max(120).optional().default(""),
  accentColor: z.string().trim().max(20).optional().default("#4f46e5"),
});

const fields = z.object({
  name: z.string().trim().min(1, "Enter a template name.").max(200),
  assetUrl: z.string().trim().url("Enter a valid image URL.").or(z.literal("")).optional(),
  layout,
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.action === "delete") {
    // Courses/certificates referencing this template have optional FKs → set null.
    await prisma.certificateTemplate.delete({ where: { id: data.id } });
    return ok({ deleted: true });
  }

  const payload = {
    name: data.name,
    assetUrl: data.assetUrl || null,
    layout: data.layout,
  };

  const template =
    data.action === "create"
      ? await prisma.certificateTemplate.create({ data: payload })
      : await prisma.certificateTemplate.update({ where: { id: data.id }, data: payload });

  return ok({ template });
});
