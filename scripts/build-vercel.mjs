/**
 * scripts/build-vercel.mjs — wrapper que delega para o build-vercel do api-server
 *
 * O Vercel dashboard executa "node scripts/build-vercel.mjs" a partir da raiz,
 * mas o script real está em artifacts/api-server/build-vercel.mjs (onde o esbuild
 * está disponível como dependência). Este wrapper apenas reexporta o script correto.
 *
 * Necessário porque o esbuild só é instalado em artifacts/api-server/node_modules,
 * e o script original usa path relativo a __dirname para localizar src/app.ts.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const realScript = path.resolve(scriptDir, "../artifacts/api-server/build-vercel.mjs");

await import(`file://${realScript}`);
