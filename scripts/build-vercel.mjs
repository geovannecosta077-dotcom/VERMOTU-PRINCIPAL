/**
 * build-vercel.mjs — Build Output API v3 para a Vercel
 *
 * Cria a estrutura .vercel/output/ que a Vercel reconhece automaticamente:
 *   .vercel/output/static/          → arquivos estáticos do frontend (Vite)
 *   .vercel/output/functions/api/index.func/  → Express como serverless
 *   .vercel/output/config.json      → rotas (SPA + /api/*)
 *
 * Dessa forma, frontend estático e API serverless convivem no mesmo projeto
 * Vercel sem depender de framework detection ou api/ directory magic.
 */

import { build as esbuild } from "esbuild";
import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

globalThis.require = createRequire(import.meta.url);

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
// scripts/ fica em repoRoot/scripts/, então o repoRoot real é um nível acima
const root = path.resolve(repoRoot, "..");

const OUT_DIR      = path.join(root, ".vercel/output");
const STATIC_DIR   = path.join(OUT_DIR, "static");
const FUNC_DIR     = path.join(OUT_DIR, "functions/api/index.func");
const FRONTEND_DIST = path.join(root, "artifacts/motohub/dist");
const API_SRC      = path.join(root, "artifacts/api-server/src/app.ts");

// ── 1. Limpar saída anterior ───────────────────────────────────────────────
console.log("🧹 Limpando .vercel/output/ ...");
await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(STATIC_DIR, { recursive: true });
await mkdir(FUNC_DIR,   { recursive: true });

// ── 2. Build do bundle serverless (Express → ESM auto-contido) ────────────
console.log("⚡ Compilando API serverless (esbuild) ...");
await esbuild({
  entryPoints: [API_SRC],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: path.join(FUNC_DIR, "index.mjs"),
  logLevel: "info",
  // NODE_ENV=production → pino sem pino-pretty → sem worker threads
  define: { "process.env.NODE_ENV": '"production"' },
  // Apenas nativos ficam de fora; todo JS é embutido (auto-contido)
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

// ── 4. Copiar frontend compilado → static/ ────────────────────────────────
console.log("📦 Copiando frontend → .vercel/output/static/ ...");
await cp(FRONTEND_DIST, STATIC_DIR, { recursive: true });

// ── 5. Configuração de rotas ───────────────────────────────────────────────
await writeFile(path.join(OUT_DIR, "config.json"), JSON.stringify({
  version: 3,
  routes: [
    // API → função serverless
    { src: "^/api(/.*)?$", dest: "/api/index" },
    // Assets estáticos (cache longo)
    {
      src: "/assets/(.*)",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      continue: true,
    },
    // Qualquer rota com ponto → arquivo estático (404 se não existir)
    { handle: "filesystem" },
    // SPA fallback — todas as outras rotas carregam o index.html
    { src: "/(.*)", dest: "/index.html" },
  ],
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options",  value: "nosniff" },
        { key: "X-Frame-Options",         value: "SAMEORIGIN" },
        { key: "X-XSS-Protection",        value: "1; mode=block" },
        { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
}, null, 2));

console.log("✅ .vercel/output/ pronto para deploy!");
