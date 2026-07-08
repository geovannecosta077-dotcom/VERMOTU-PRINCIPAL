---
name: S3 object storage migration
description: Replit Object Storage (GCS sidecar 127.0.0.1:1106) replaced with standard S3-compatible client; objectAcl.ts deleted.
---

## Rule
The project now uses `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for all file storage. The Replit-specific GCS external_account credential flow and sidecar endpoint are gone.

## Key files
- `artifacts/api-server/src/lib/objectStorage.ts` — S3Client, ObjectStorageService, S3ObjectRef type
- `artifacts/api-server/src/routes/storage.ts` — uses S3ObjectRef (not GCS File)
- `objectAcl.ts` was deleted (ACL logic merged into objectStorage.ts using S3 object tags)

## Configuration env vars
S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
Leave S3_ENDPOINT empty for standard AWS S3; set to R2/MinIO endpoint for alternatives.

**Why:** Replit Object Storage relies on a local sidecar (127.0.0.1:1106) that only exists inside Replit; any deploy outside Replit needs a real S3-compatible provider.

**How to apply:** When modifying upload/download code, use S3ObjectRef { key, bucket } — never import from @google-cloud/storage.
