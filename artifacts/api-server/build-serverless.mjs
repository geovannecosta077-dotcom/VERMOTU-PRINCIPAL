/**
 * Serverless build — compila src/app.ts para ../../api/index.mjs.
 *
 * Diferenças do build normal (build.mjs):
 *  - Entrada: src/app.ts (sem listen()) em vez de src/index.ts
 *  - Saída:   ../../api/index.mjs (raiz do repo, detectada pela Vercel)
 *  - Define NODE_ENV=production em tempo de build para eliminar
 *    o transporte pino-pretty (e portanto worker threads)
 *  - Sem esbuildPluginPino — não há workers em produção
 *  - Todos os pacotes JS são embutidos (bundle completo, sem externos JS)
 *    para que a função seja auto-contida na Vercel
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(artifactDir, "../..");
const outFile = path.resolve(repoRoot, "api/index.mjs");

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/app.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: outFile,
  logLevel: "info",
  // Define NODE_ENV em tempo de build → esbuild elimina o branch pino-pretty
  // (dead-code elimination) → sem worker threads → seguro para serverless
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // Apenas binários nativos ficam de fora — tudo JS é embutido
  external: [
    "*.node",
    "pg-native",        // pg usa pure-JS como fallback se pg-native não existir
    "fsevents",
    "cpu-features",
    "ssh2",
  ],
  sourcemap: false,
  // Compatibilidade CJS→ESM para express e outros pacotes CommonJS
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

console.log("✅ Bundle serverless gerado em:", outFile);
