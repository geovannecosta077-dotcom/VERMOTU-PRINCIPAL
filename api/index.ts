// Vercel serverless entry point for the VERMOTU API.
//
// @vercel/node compiles this file with esbuild at deploy time.
// Workspace packages (@workspace/db, @workspace/api-zod) resolve through
// pnpm symlinks in node_modules — no separate build step needed.
//
// The Express app must NOT call app.listen() here; Vercel wraps it
// automatically as a serverless handler.
export { default } from "../artifacts/api-server/src/app";
