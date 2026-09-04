import app from "./app";
import { logger } from "./lib/logger";
import { getDatabaseHost } from "@workspace/db";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

function validateSupabaseEnvironment(): void {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKeyName = process.env.SUPABASE_ANON_KEY?.trim()
    ? "SUPABASE_ANON_KEY"
    : process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : null;

  let projectRef = "unknown";
  if (supabaseUrl) {
    try {
      const hostname = new URL(supabaseUrl).hostname;
      projectRef = hostname.endsWith(".supabase.co")
        ? hostname.slice(0, -".supabase.co".length)
        : hostname;
    } catch {
      projectRef = "invalid-url";
    }
  }

  const missing = [
    !supabaseUrl ? "SUPABASE_URL" : null,
    !supabaseKeyName ? "SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY" : null,
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    logger.error(
      { projectRef, missing, databaseHost: getDatabaseHost() },
      "Supabase environment is incomplete",
    );
    return;
  }

  if (!supabaseKeyName) return;

  const configuredKeyName = supabaseKeyName;
  logger.info(
    { projectRef, key: `${configuredKeyName.slice(0, -4)}****` },
    "Supabase project configured",
  );
}

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

validateSupabaseEnvironment();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
