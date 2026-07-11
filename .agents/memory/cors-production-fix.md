---
name: CORS production fix — vermotu.com.br
description: The CORS allowlist only matched Replit domains, blocking all POST requests on the custom Vercel production domain.
---

The CORS `origin` callback in `artifacts/api-server/src/app.ts` only allowed
`*.replit.dev / *.replit.app / *.repl.co` and `REPLIT_DOMAINS` env var values.
On Vercel, `REPLIT_DOMAINS` is empty, so every credentialed POST (login, register,
etc.) from `https://vermotu.com.br` threw `Error: Not allowed by CORS` → HTTP 500.

**Fix applied (commit 6bf1d8a):**
- `https://vermotu.com.br` and `https://www.vermotu.com.br` hard-coded as permanent
  production origins.
- `VERCEL_ORIGIN_PATTERN` regex added for `*.vercel.app` preview deployments.
- `ALLOWED_ORIGINS` env var support added for ad-hoc extra origins.
- `credentials: true`, explicit `methods`/`allowedHeaders`, `maxAge: 600` added.

**Why:** GET requests appeared to work because they don't require CORS preflight;
only POST/PUT/DELETE with `Content-Type: application/json` triggered the origin check.

**How to apply:** If CORS issues recur for a new domain, add it to `PRODUCTION_ORIGINS`
in `app.ts` or set `ALLOWED_ORIGINS` in Vercel environment variables.
