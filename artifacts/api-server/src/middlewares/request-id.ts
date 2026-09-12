import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

/**
 * Attaches a unique request ID to every incoming request.
 * - Sets `req.id` for use by pino-http and downstream handlers.
 * - Echoes the ID back in the `X-Request-Id` response header.
 * - Respects an existing `X-Request-Id` from a reverse proxy/load balancer.
 */
export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const existingId = req.headers["x-request-id"];
  const requestId =
    typeof existingId === "string" && existingId.length > 0
      ? existingId
      : `req_${randomUUID().replace(/-/g, "")}`;

  // pino-http uses req.id for log correlation
  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};
