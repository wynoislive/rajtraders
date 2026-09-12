import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

/**
 * Custom application error with an error code and HTTP status.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Global error handler — must be mounted LAST in the Express middleware chain.
 *
 * - Handles `AppError` with code + message
 * - Handles `ZodError` with field-level validation details
 * - Strips stack traces in production
 */
export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = (req as any).id ?? "unknown";
  const isProduction = process.env.NODE_ENV === "production";

  // ── Zod validation error ──────────────────────────────────
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
      code: e.code,
    }));

    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details,
      },
      requestId,
    });
    return;
  }

  // ── Custom AppError ───────────────────────────────────────
  if (err instanceof AppError) {
    logger.warn(
      { requestId, code: err.code, statusCode: err.statusCode },
      err.message,
    );

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      requestId,
    });
    return;
  }

  // ── Unexpected / unhandled error ──────────────────────────
  logger.error(
    { requestId, err, stack: err?.stack },
    "Unhandled error in request pipeline",
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: err?.message ?? "An unexpected error occurred. Please try again later.",
      ...(isProduction ? {} : { stack: err?.stack }),
    },
    requestId,
  });
};
