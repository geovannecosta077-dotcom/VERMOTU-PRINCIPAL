import { Router, type IRouter, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getDatabaseHost, pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function databaseHealthCheck(res: Response): Promise<void> {
  try {
    await pool.query("SELECT 1");
    res.status(200).json(HealthCheckResponse.parse({ status: "ok" }));
  } catch (error) {
    const timestamp = new Date().toISOString();
    logger.error(
      { err: error, databaseHost: getDatabaseHost(), timestamp },
      "Health check: database connection failed",
    );
    res.status(503).json(
      HealthCheckResponse.parse({
        status: "error",
        detail: "Serviço temporariamente indisponível",
      }),
    );
  }
}

router.get("/health", async (_req, res) => {
  await databaseHealthCheck(res);
});

router.get("/healthz", async (_req, res) => {
  await databaseHealthCheck(res);
});

export default router;
