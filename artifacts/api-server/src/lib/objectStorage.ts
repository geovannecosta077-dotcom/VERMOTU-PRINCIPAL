import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, Backblaze B2).
//
// This replaces the previous Replit-only implementation, which authenticated
// against a local sidecar at 127.0.0.1:1106. That sidecar only exists inside
// the Replit workspace — any deploy outside Replit (including the project's
// official Vercel production environment) would silently fail every upload,
// which was the root cause of "photos don't upload / listings can't be
// created" in production.
//
// Required env vars: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
// Optional: S3_ENDPOINT (leave empty for AWS S3; set for R2/MinIO/B2),
// S3_REGION (defaults to "us-east-1", use "auto" for R2).
// ---------------------------------------------------------------------------

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

class ObjectStorageConfigError extends Error {
  constructor(missing: string) {
    super(
      `${missing} não configurado. Defina as variáveis de ambiente S3_BUCKET, ` +
        "S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY (veja .env.example).",
    );
    this.name = "ObjectStorageConfigError";
  }
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const region = process.env.S3_REGION || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  cachedClient = new S3Client({
    region,
    endpoint,
    // Path-style addressing is required by most non-AWS S3-compatible
    // providers (R2, MinIO, B2). Standard AWS S3 works with either.
    forcePathStyle: Boolean(endpoint),
    credentials:
      accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  });
  return cachedClient;
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new ObjectStorageConfigError("S3_BUCKET");
  return bucket;
}

export interface StoredObjectRef {
  bucket: string;
  key: string;
}

const PRIVATE_PREFIX = "private/";
const PUBLIC_PREFIX = "public/";

export class ObjectStorageService {
  /**
   * Generates a presigned PUT URL the browser uploads directly to (no file
   * bytes pass through our server). Returns both the signed URL and the
   * internal `/objects/...` path the client should send back to us once the
   * upload completes.
   */
  async getObjectEntityUploadURL(contentType?: string): Promise<{ uploadURL: string; objectPath: string }> {
    const bucket = getBucket();
    const objectId = randomUUID();
    const key = `${PRIVATE_PREFIX}uploads/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType || undefined,
    });
    const uploadURL = await getSignedUrl(getClient(), command, { expiresIn: 900 });

    return { uploadURL, objectPath: `/objects/uploads/${objectId}` };
  }

  /** Resolves an internal `/objects/...` path to a bucket+key, verifying it exists. */
  async getObjectEntityFile(objectPath: string): Promise<StoredObjectRef> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const entityId = objectPath.slice("/objects/".length);
    if (!entityId) throw new ObjectNotFoundError();

    const bucket = getBucket();
    const key = `${PRIVATE_PREFIX}${entityId}`;
    try {
      await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      throw new ObjectNotFoundError();
    }
    return { bucket, key };
  }

  async searchPublicObject(filePath: string): Promise<StoredObjectRef | null> {
    const bucket = getBucket();
    const key = `${PUBLIC_PREFIX}${filePath}`;
    try {
      await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return { bucket, key };
    } catch {
      return null;
    }
  }

  async downloadObject(ref: StoredObjectRef, cacheTtlSec = 3600): Promise<Response> {
    const result = await getClient().send(new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
    if (!result.Body) throw new ObjectNotFoundError();

    const nodeStream = result.Body as unknown as Readable;
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": result.ContentType || "application/octet-stream",
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    };
    if (result.ContentLength != null) headers["Content-Length"] = String(result.ContentLength);

    return new Response(webStream, { headers });
  }
}
