import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_PREFIXES = new Set(["avatars", "thumbnails", "attachments", "resumes", "banners"]);

export const POST = handler(async (req: Request) => {
  await requireUser();

  const form = await req.formData();
  const file = form.get("file");
  const prefix = String(form.get("prefix") ?? "attachments");

  if (!(file instanceof File)) return fail("No file provided.");
  if (file.size > MAX_BYTES) return fail("File exceeds the 20 MB limit.");
  if (!ALLOWED_PREFIXES.has(prefix)) return fail("Invalid upload target.");

  const result = await uploadFile(prefix, file);
  if ("error" in result) return fail(result.error, 502);

  return ok({ url: result.url });
});
