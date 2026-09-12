import { Router, type Request, type Response } from "express";
import { startEmailWorker, stopEmailWorker } from "../lib/email-worker";
import { logger } from "../lib/logger";

const router: Router = Router();

/**
 * POST /v1/cron/drain-emails
 *
 * Called by Vercel Cron Job to drain pending email jobs from the BullMQ queue.
 * Protected by CRON_SECRET env var — the request must include the matching
 * `Authorization: Bearer <CRON_SECRET>` header.
 *
 * The worker processes jobs for up to 25 seconds (leaving 5s buffer in a
 * typical 30s Vercel Function timeout), then shuts down gracefully.
 */
router.post("/drain-emails", async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.status(500).json({ error: "CRON_SECRET not configured." });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (token !== cronSecret) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  try {
    const worker = startEmailWorker();
    if (!worker) {
      res.status(503).json({ error: "Email worker unavailable (Redis not connected)." });
      return;
    }

    // Let the worker run for up to 25 seconds, then stop gracefully
    await new Promise<void>((resolve) => setTimeout(resolve, 25_000));
    await stopEmailWorker();

    logger.info("Cron: email queue drained");
    res.status(200).json({ success: true, message: "Email queue drained." });
  } catch (err: any) {
    logger.error({ err }, "Cron: failed to drain email queue");
    res.status(500).json({ error: "Failed to drain email queue." });
  }
});

export default router;
