---
name: S3 object storage migration
description: Supabase Storage S3 is the only runtime object-storage backend; legacy Replit/GCS storage must not be restored.
---

## Rule
The project uses `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` against the Supabase Storage S3 endpoint for uploads and object reads. The bucket is `vermotu-uploads`.

## Key files
- `artifacts/api-server/src/lib/objectStorage.ts` — Supabase S3 client-backed object proxy
- `artifacts/api-server/src/lib/supabaseStorage.ts` — presigned upload URLs
- `artifacts/api-server/src/routes/storage.ts` — upload and object proxy routes

## Configuration env vars
SUPABASE_URL, SUPABASE_S3_ENDPOINT, SUPABASE_S3_REGION, SUPABASE_S3_ACCESS_KEY_ID, SUPABASE_S3_SECRET_ACCESS_KEY

**Why:** Production runs outside Replit and must use the active Supabase project rather than a local sidecar or an unrelated Vercel-managed integration.

**How to apply:** When modifying upload/download code, use the Supabase S3 variables and the `vermotu-uploads` bucket; never add Replit/GCS storage fallbacks.
