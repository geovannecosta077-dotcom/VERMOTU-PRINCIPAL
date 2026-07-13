/**
 * build-vercel.mjs — Vercel Build Output API v3
 *
 * Roda de dentro de artifacts/api-server/ onde esbuild está disponível.
 * Cria .vercel/output/ na raiz do repositório:
 *   static/                        → frontend Vite compilado
 *   functions/api/index.func/      → Express como serverless ESM
 *   config.json                    → rotas (SPA + /api/*)
 */

import { build as esbuild } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

globalThis.require = createRequire(import.meta.url);

const apiServerDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot     = path.resolve(apiServerDir, "../..");

const OUT_DIR       = path.join(repoRoot, ".vercel/output");
const STATIC_DIR    = path.join(OUT_DIR, "static");
const FUNC_DIR      = path.join(OUT_DIR, "functions/api/index.func");
const FRONTEND_DIST = path.join(repoRoot, "artifacts/motohub/dist");

// ── 1. Limpar saída anterior ───────────────────────────────────────────────
console.log("🧹 Limpando .vercel/output/ ...");
await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(STATIC_DIR, { recursive: true });
await mkdir(FUNC_DIR,   { recursive: true });

// ── 2. Build do bundle serverless ─────────────────────────────────────────
console.log("⚡ Compilando API serverless (esbuild) ...");
await esbuild({
  entryPoints: [path.join(apiServerDir, "src/app.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: path.join(FUNC_DIR, "index.mjs"),
  logLevel: "info",
  define: { "process.env.NODE_ENV": '"production"' },
  external: ["*.node", "pg-native", "fsevents", "cpu-features", "ssh2"],
  sourcemap: false,
  banner: {
    js: `import { createRequire as __crReq } from 'node:module';
import __bPath from 'node:path';
import __bUrl from 'node:url';
globalThis.require = __crReq(import.meta.url);
globalThis.__filename = __bUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bPath.dirname(globalThis.__filename);
`,
  },
});

// ── 3. Metadados da função serverless ─────────────────────────────────────
await writeFile(path.join(FUNC_DIR, ".vc-config.json"), JSON.stringify({
  runtime: "nodejs22.x",
  handler: "index.mjs",
  launcherType: "Nodejs",
  shouldAddHelpers: true,
}, null, 2));

// ── 4. Copiar frontend compilado ───────────────────────────────────────────
console.log("📦 Copiando frontend → .vercel/output/static/ ...");
await cp(FRONTEND_DIST, STATIC_DIR, { recursive: true });

// ── 5. Rotas ──────────────────────────────────────────────────────────────
await writeFile(path.join(OUT_DIR, "config.json"), JSON.stringify({
  version: 3,
  routes: [
    { src: "^/api(/.*)?$", dest: "/api/index" },
    {
      src: "/assets/(.*)",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      continue: true,
    },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ],
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options",        value: "SAMEORIGIN" },
        { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
}, null, 2));

console.log("✅ .vercel/output/ pronto!");
