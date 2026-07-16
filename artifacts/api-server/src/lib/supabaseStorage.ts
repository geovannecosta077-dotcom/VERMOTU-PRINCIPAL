import { randomUUID } from "crypto";

const BUCKET = "motohub-uploads";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return { url, key };
}

/**
 * Ensures the upload bucket exists in Supabase Storage.
 * Safe to call repeatedly — ignores "already exists" errors.
 */
async function ensureUploadBucket(url: string, key: string): Promise<void> {
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      fileSizeLimit: 10485760, // 10 MB
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; statusCode?: string };
    // Ignore duplicate / already-exists
    if (body?.error !== "Duplicate" && body?.statusCode !== "409" && response.status !== 409) {
      throw new Error(`Failed to create storage bucket: ${JSON.stringify(body)}`);
    }
  }
}

let bucketReady = false;

/**
 * Returns a presigned upload URL (browser PUTs the file directly to Supabase)
 * and the public URL where the object will be accessible after upload.
 */
export async function getSupabaseUploadURL(filename: string): Promise<{
  uploadURL: string;
  objectPath: string;
}> {
  const { url, key } = getSupabaseConfig();

  if (!bucketReady) {
    await ensureUploadBucket(url, key);
    bucketReady = true;
  }

  // Use uuid to avoid collisions; keep original filename extension for MIME inference
  const ext = filename.includes(".") ? `.${filename.split(".").pop()!.toLowerCase()}` : "";
  const objectName = `${randomUUID()}${ext}`;

  const response = await fetch(
    `${url}/storage/v1/object/sign/upload/${BUCKET}/${objectName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ upsert: false }),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`Failed to create signed upload URL: ${JSON.stringify(body)}`);
  }

  const data = (await response.json()) as { signedUrl: string };

  // signedUrl is a relative path (/storage/v1/object/upload/sign/...)
  const uploadURL = `${url}${data.signedUrl}`;
  // Public URL — accessible immediately after a successful PUT
  const objectPath = `${url}/storage/v1/object/public/${BUCKET}/${objectName}`;

  return { uploadURL, objectPath };
}
