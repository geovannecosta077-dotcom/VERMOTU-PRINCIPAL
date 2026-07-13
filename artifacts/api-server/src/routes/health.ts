import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Temporary diagnostic
router.get("/dbtest", async (_req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW() as now");
    client.release();
    res.json({ ok: true, now: result.rows[0].now });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: err?.message ?? String(err),
      code: err?.code,
      detail: err?.detail,
    });
  }
});

export default router;
