import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Security headers
app.use(
        (helmet as any)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// ---------------------------------------------------------------------------
// CORS
// Canonical production domain: https://vermotu.com.br
// Additional origins accepted via ALLOWED_ORIGINS env var (comma-separated).
// Replit dev domains are included automatically in development.
// ---------------------------------------------------------------------------

// Hard-coded production origins — always allowed regardless of env vars
const PRODUCTION_ORIGINS = new Set([
  "https://vermotu.com.br",
  "https://www.vermotu.com.br",
]);

// Vercel preview deployments and the project's own *.vercel.app domains
const VERCEL_ORIGIN_PATTERN =
  /^https:\/\/([a-zA-Z0-9-]+-[a-zA-Z0-9]+-[a-zA-Z0-9-]+\.vercel\.app|vermotu-principal(-[a-zA-Z0-9-]+)?\.vercel\.app)$/;

// Replit dev domains (populated automatically by Replit runtime; empty on Vercel)
const replitDomains = new Set(
  (process.env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => `https://${d}`),
);

// Extra origins injected via env var (e.g. a specific preview URL you want to pin)
const extraOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

const LOCAL_ORIGIN_PATTERN = /^https?:\/\/localhost(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      // Server-to-server requests have no Origin header — always allow
      if (!origin) return cb(null, true);

      if (
        PRODUCTION_ORIGINS.has(origin) ||
        replitDomains.has(origin) ||
        extraOrigins.has(origin) ||
        LOCAL_ORIGIN_PATTERN.test(origin) ||
        VERCEL_ORIGIN_PATTERN.test(origin)
      ) {
        return cb(null, true);
      }

      logger.warn({ origin }, "CORS: rejected request from unlisted origin");
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 600,
  }),
);

app.use(
  (pinoHttp as any)({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Stripe webhook needs the raw request body to validate the signature,
// so it must be parsed before the global JSON body parser runs.
app.use("/api/subscriptions/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/api", router);

export default app;
