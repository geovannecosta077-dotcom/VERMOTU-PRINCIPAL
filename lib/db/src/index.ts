import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export function getDatabaseHost(): string {
  try {
    return new URL(connectionString!).hostname || "unknown";
  } catch {
    return process.env.PGHOST || "unknown";
  }
}

export function isDatabaseConnectionError(error: unknown): boolean {
  const connectionCodes = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EAI_AGAIN",
    "57P01",
    "57P02",
    "57P03",
    "53300",
    "08000",
    "08001",
    "08003",
    "08004",
    "08006",
    "08007",
    "08P01",
  ]);

  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current === "object" || typeof current === "function") {
      const candidate = current as { code?: unknown; cause?: unknown };
      if (typeof candidate.code === "string" && connectionCodes.has(candidate.code)) {
        return true;
      }
      current = candidate.cause;
      continue;
    }

    if (typeof current === "string") {
      return /(ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|timeout|timed out|connection terminated|server closed the connection)/i.test(
        current,
      );
    }
    break;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /(ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|timeout|timed out|connection terminated|server closed the connection)/i.test(
    message,
  );
}

export * from "./schema";
