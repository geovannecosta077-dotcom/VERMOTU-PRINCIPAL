import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import {
  getSupabaseStorageConfig,
  SUPABASE_STORAGE_BUCKET,
} from "./supabaseStorage";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface StoredObjectRef {
  bucket: string;
  key: string;
}

const PRIVATE_PREFIX = "private/";
const PUBLIC_PREFIX = "public/";

export class ObjectStorageService {
  /**
   * Returns configured public search prefixes for the legacy proxy route.
   * The storage bucket itself is always the current Supabase bucket.
   */
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || PUBLIC_PREFIX;
    return Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim().replace(/^\/+|\/+$/g, ""))
          .filter(Boolean),
      ),
    );
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR?.trim().replace(/^\/+|\/+$/g, "");
    return dir ? `${dir}/` : PRIVATE_PREFIX;
  }

  async searchPublicObject(filePath: string): Promise<StoredObjectRef | null> {
    const { client } = getSupabaseStorageConfig();
    const normalizedPath = filePath.replace(/^\/+/, "");

    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const key = `${searchPath}/${normalizedPath}`;
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: SUPABASE_STORAGE_BUCKET,
            Key: key,
          }),
        );
        return { bucket: SUPABASE_STORAGE_BUCKET, key };
      } catch {
        // Try the next configured public prefix.
      }
    }
    return null;
  }

  async downloadObject(
    object: StoredObjectRef,
    cacheTtlSec = 3600,
  ): Promise<Response> {
    const { client } = getSupabaseStorageConfig();
    const result = await client.send(
      new GetObjectCommand({
        Bucket: object.bucket,
        Key: object.key,
      }),
    );
    if (!result.Body) throw new ObjectNotFoundError();

    const nodeStream = result.Body as unknown as Readable;
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type": result.ContentType || "application/octet-stream",
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    };
    if (result.ContentLength != null) {
      headers["Content-Length"] = String(result.ContentLength);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(
    contentType?: string,
  ): Promise<{ uploadURL: string; objectPath: string }> {
    const { client } = getSupabaseStorageConfig();
    const objectId = randomUUID();
    const key = `${this.getPrivateObjectDir()}uploads/${objectId}`;
    const uploadURL = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: SUPABASE_STORAGE_BUCKET,
        Key: key,
        ContentType: contentType || undefined,
      }),
      { expiresIn: 900 },
    );

    return { uploadURL, objectPath: `/objects/uploads/${objectId}` };
  }

  async getObjectEntityFile(objectPath: string): Promise<StoredObjectRef> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const entityId = objectPath.slice("/objects/".length);
    if (!entityId) throw new ObjectNotFoundError();

    const { client } = getSupabaseStorageConfig();
    const key = `${this.getPrivateObjectDir()}${entityId}`;
    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: SUPABASE_STORAGE_BUCKET,
          Key: key,
        }),
      );
    } catch {
      throw new ObjectNotFoundError();
    }

    return { bucket: SUPABASE_STORAGE_BUCKET, key };
  }
}