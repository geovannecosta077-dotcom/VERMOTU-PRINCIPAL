import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectTaggingCommand, GetObjectTaggingCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// S3-compatible storage client
// Works with AWS S3, Cloudflare R2, MinIO, and any S3-compatible provider.
// Configure via environment variables (see .env.example).
// ---------------------------------------------------------------------------

function getS3Config() {
  const endpoint = process.env["S3_ENDPOINT"];
  const region = process.env["S3_REGION"] ?? "us-east-1";
  const accessKeyId = process.env["S3_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["S3_SECRET_ACCESS_KEY"];
  const bucket = process.env["S3_BUCKET"];

  if (!bucket) throw new Error("S3_BUCKET environment variable is required.");
  if (!accessKeyId) throw new Error("S3_ACCESS_KEY_ID environment variable is required.");
  if (!secretAccessKey) throw new Error("S3_SECRET_ACCESS_KEY environment variable is required.");

  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

function createS3Client() {
  const { endpoint, region, accessKeyId, secretAccessKey } = getS3Config();
  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: { accessKeyId, secretAccessKey },
  });
}

// Singleton — created lazily so missing env vars fail at request time, not at boot.
let _s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!_s3Client) _s3Client = createS3Client();
  return _s3Client;
}

// ---------------------------------------------------------------------------
// S3ObjectRef — replaces the GCS File type as the internal handle for objects.
// ---------------------------------------------------------------------------
export interface S3ObjectRef {
  key: string;
  bucket: string;
  contentType?: string;
  size?: number;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// ---------------------------------------------------------------------------
// ACL helpers (stored as S3 object tags)
// ---------------------------------------------------------------------------
export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
}

async function setObjectAclPolicyTag(key: string, bucket: string, policy: ObjectAclPolicy): Promise<void> {
  await getS3Client().send(new PutObjectTaggingCommand({
    Bucket: bucket,
    Key: key,
    Tagging: {
      TagSet: [
        { Key: "acl-owner", Value: policy.owner },
        { Key: "acl-visibility", Value: policy.visibility },
      ],
    },
  }));
}

async function getObjectAclPolicyTag(key: string, bucket: string): Promise<ObjectAclPolicy | null> {
  try {
    const result = await getS3Client().send(new GetObjectTaggingCommand({ Bucket: bucket, Key: key }));
    const tags = result.TagSet ?? [];
    const owner = tags.find((t) => t.Key === "acl-owner")?.Value;
    const visibility = tags.find((t) => t.Key === "acl-visibility")?.Value as "public" | "private" | undefined;
    if (!owner || !visibility) return null;
    return { owner, visibility };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ObjectStorageService
// ---------------------------------------------------------------------------
export class ObjectStorageService {
  private getBucket(): string {
    return getS3Config().bucket;
  }

  /**
   * Generate a presigned PUT URL for uploading a new file.
   * Returns both the upload URL (for the client to PUT to) and the normalized
   * /objects/... path used to reference the file within the app.
   */
  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; objectPath: string }> {
    const bucket = this.getBucket();
    const key = `uploads/${randomUUID()}`;

    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    const uploadURL = await getSignedUrl(getS3Client(), command, { expiresIn: 900 });
    const objectPath = `/objects/${key}`;

    return { uploadURL, objectPath };
  }

  /**
   * Normalize an S3 presigned URL or raw path into the app's /objects/... path format.
   * If it's already a relative /objects/... path, return as-is.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("http")) {
      // Already a relative /objects/... path or other non-URL
      return rawPath;
    }
    try {
      const url = new URL(rawPath);
      let pathname = url.pathname;
      const bucket = this.getBucket();
      // Path-style: /{bucket}/{key}  →  strip bucket prefix
      if (pathname.startsWith(`/${bucket}/`)) {
        pathname = pathname.slice(bucket.length + 1);
      }
      // Remove leading slash to get the key
      const key = pathname.replace(/^\//, "");
      return `/objects/${key}`;
    } catch {
      return rawPath;
    }
  }

  /**
   * Find a public object by relative file path (searches with "public/" prefix convention).
   */
  async searchPublicObject(filePath: string): Promise<S3ObjectRef | null> {
    const bucket = this.getBucket();
    const key = `public/${filePath}`;
    try {
      const head = await getS3Client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return { key, bucket, contentType: head.ContentType, size: head.ContentLength };
    } catch {
      return null;
    }
  }

  /**
   * Stream an S3 object as a Response (compatible with Express res.pipe()).
   */
  async downloadObject(obj: S3ObjectRef, cacheTtlSec = 3600): Promise<Response> {
    const result = await getS3Client().send(new GetObjectCommand({ Bucket: obj.bucket, Key: obj.key }));

    if (!result.Body) throw new ObjectNotFoundError();

    const aclPolicy = await getObjectAclPolicyTag(obj.key, obj.bucket);
    const isPublic = aclPolicy?.visibility === "public";

    const headers: Record<string, string> = {
      "Content-Type": obj.contentType ?? result.ContentType ?? "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (result.ContentLength) headers["Content-Length"] = String(result.ContentLength);

    return new Response(result.Body as ReadableStream, { headers });
  }

  /**
   * Resolve a /objects/... app path to an S3ObjectRef.
   */
  async getObjectEntityFile(objectPath: string): Promise<S3ObjectRef> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();

    const key = objectPath.replace(/^\/objects\//, "");
    const bucket = this.getBucket();

    try {
      const head = await getS3Client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return { key, bucket, contentType: head.ContentType, size: head.ContentLength };
    } catch {
      throw new ObjectNotFoundError();
    }
  }

  async trySetObjectEntityAclPolicy(rawPath: string, aclPolicy: ObjectAclPolicy): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/objects/")) return normalizedPath;

    const key = normalizedPath.replace(/^\/objects\//, "");
    await setObjectAclPolicyTag(key, this.getBucket(), aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission = "read",
  }: {
    userId?: string;
    objectFile: S3ObjectRef;
    requestedPermission?: "read" | "write";
  }): Promise<boolean> {
    const aclPolicy = await getObjectAclPolicyTag(objectFile.key, objectFile.bucket);
    if (!aclPolicy) return false;
    if (aclPolicy.visibility === "public" && requestedPermission === "read") return true;
    if (!userId) return false;
    return aclPolicy.owner === userId;
  }
}

// Needed for presigned PUT — @aws-sdk/client-s3 re-export
import { PutObjectCommand } from "@aws-sdk/client-s3";
