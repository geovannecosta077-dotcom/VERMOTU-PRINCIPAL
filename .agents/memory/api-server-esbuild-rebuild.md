---
name: api-server esbuild rebuild
description: Why edited api-server routes/app code can silently 404 even though the file on disk is correct.
---

The `api-server` `dev` script does `pnpm run build && pnpm run start` once at process start (esbuild bundle to `dist/index.mjs`), then runs the compiled bundle — it does not watch/rebuild on file changes like Vite does for the frontend.

**Why:** If you edit `src/app.ts` or any route file while the workflow is already running, the running process keeps serving the old bundle. This shows up as confusing 404s on routes that clearly exist in the source, with no error in the logs.

**How to apply:** Any time you edit `artifacts/api-server/src/**` after the workflow was already started, restart the `api-server` workflow (not just the frontend) before testing/curling endpoints, or the change won't be live.
