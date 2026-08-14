import "server-only";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

let bucketEnsured = false;

async function ensureBucket() {
  if (bucketEnsured || !SUPABASE_URL || !SERVICE_KEY) return;
  // Create the bucket (public) if it doesn't already exist.
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  }).catch(() => {});
  bucketEnsured = true;
}

/**
 * Uploads a file to Supabase Storage and returns its public URL.
 * @param prefix logical folder, e.g. "avatars" | "thumbnails" | "attachments"
 */
export async function uploadFile(
  prefix: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { error: "Storage is not configured." };
  }
  await ensureBucket();

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const safePrefix = prefix.replace(/[^a-z0-9/_-]/gi, "");
  const path = `${safePrefix}/${crypto.randomUUID()}.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: await file.arrayBuffer(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { error: `Upload failed: ${res.status} ${text}` };
  }

  return { url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}` };
}
