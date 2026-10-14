import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getDbReplicationHealth } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health/db", async (_req, res) => {
  try {
    const health = await getDbReplicationHealth();
    const isDegraded = !health.primaryConnected || (!health.isReplicaHealthy && health.isReplicaConfigured);
    res.status(isDegraded ? 503 : 200).json({
      status: isDegraded ? "degraded" : "ok",
      timestamp: new Date().toISOString(),
      ...health,
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
