import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const SUPABASE_STORAGE_BUCKET = "vermotu-uploads";

export class SupabaseStorageConfigurationError extends Error {
  constructor(missing: string[]) {
    super(`Supabase Storage não configurado. Variáveis ausentes: ${missing.join(", ")}`);
    this.name = "SupabaseStorageConfigurationError";
    Object.setPrototypeOf(this, SupabaseStorageConfigurationError.prototype);
  }
}

export function getSupabaseStorageConfig() {
  const endpoint = process.env.SUPABASE_S3_ENDPOINT?.replace(/\/+$/, "");
  const region = process.env.SUPABASE_S3_REGION;
  const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");

  const required: Array<[string, string | undefined]> = [
    ["SUPABASE_S3_ENDPOINT", endpoint],
    ["SUPABASE_S3_REGION", region],
    ["SUPABASE_S3_ACCESS_KEY_ID", accessKeyId],
    ["SUPABASE_S3_SECRET_ACCESS_KEY", secretAccessKey],
    ["SUPABASE_URL", publicUrl],
  ];
  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new SupabaseStorageConfigurationError(missing);
  }

  return {
    client: new S3Client({
      endpoint: endpoint!,
      region: region!,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    }),
    publicUrl: publicUrl!,
  };
}

/**
 * Returns a Supabase S3 presigned upload URL and the public URL where the
 * object will be accessible after upload.
 */
export async function getSupabaseUploadURL(
  filename: string,
  contentType?: string,
): Promise<{
  uploadURL: string;
  objectPath: string;
}> {
  const { client, publicUrl } = getSupabaseStorageConfig();

  // Use uuid to avoid collisions; keep original filename extension for MIME inference
  const ext = filename.includes(".") ? `.${filename.split(".").pop()!.toLowerCase()}` : "";
  const objectName = `${randomUUID()}${ext}`;

  const uploadURL = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: SUPABASE_STORAGE_BUCKET,
      Key: objectName,
      ContentType: contentType || undefined,
    }),
    { expiresIn: 900 },
  );
  // Public URL — accessible immediately after a successful PUT
  const objectPath = `${publicUrl}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${objectName}`;

  return { uploadURL, objectPath };
}
