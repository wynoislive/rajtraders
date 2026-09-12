import type { RequestHandler } from "express";
import { z, ZodError, type ZodSchema } from "zod";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Express middleware factory that validates `req.body`, `req.query`, and/or
 * `req.params` against the supplied Zod schemas.
 *
 * On success, the parsed (coerced/defaulted) values replace the originals so
 * downstream handlers get correctly-typed data.
 *
 * On failure, responds with a structured 400 error including field-level details.
 *
 * @example
 * ```ts
 * const CreateOrderSchema = z.object({ idempotencyKey: z.string().min(1), ... });
 * router.post("/create-order", validate({ body: CreateOrderSchema }), handler);
 * ```
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, res, next) => {
    const errors: Array<{ source: string; path: string; message: string }> = [];

    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        for (const e of err.errors) {
          errors.push({
            source: "body",
            path: e.path.join("."),
            message: e.message,
          });
        }
      }
    }

    try {
      if (schemas.query) {
        (req as any).query = schemas.query.parse(req.query);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        for (const e of err.errors) {
          errors.push({
            source: "query",
            path: e.path.join("."),
            message: e.message,
          });
        }
      }
    }

    try {
      if (schemas.params) {
        (req as any).params = schemas.params.parse(req.params);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        for (const e of err.errors) {
          errors.push({
            source: "params",
            path: e.path.join("."),
            message: e.message,
          });
        }
      }
    }

    if (errors.length > 0) {
      const requestId = (req as any).id ?? "unknown";
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          details: errors,
        },
        requestId,
      });
      return;
    }

    next();
  };
}
