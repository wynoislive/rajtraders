import type { Request, Response, NextFunction } from "express";
import { isAllowedOrigin } from "./security";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Modern Defense-in-Depth CSRF Guard Middleware
 *
 * 1. Read-only methods (GET, HEAD, OPTIONS) are permitted.
 * 2. Token-authenticated API requests with explicit Authorization header (Bearer ...)
 *    cannot be forged via standard cross-site form submissions or browser navigation.
 * 3. Webhook endpoints (e.g. Razorpay webhook) with HMAC signatures are bypassed.
 * 4. Ambient/cookie-based requests are verified via Sec-Fetch-Site and Origin/Referer headers.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // 1. Safe read-only HTTP methods
  if (!MUTATING_METHODS.has(method)) {
    return next();
  }

  // 2. Webhook endpoints that use raw body HMAC signatures
  if (req.path.includes("/webhook") || req.path.includes("/razorpay/webhook")) {
    return next();
  }

  // 3. Requests with explicit Authorization headers (e.g. Bearer staff_...) are immune to standard cross-origin CSRF
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.trim().length > 0) {
    return next();
  }

  // 4. Check Modern Sec-Fetch-Site header
  const secFetchSite = req.headers["sec-fetch-site"];
  if (secFetchSite === "cross-site") {
    res.status(403).json({
      error: "Cross-site request forgery blocked (sec-fetch-site: cross-site).",
    });
    return;
  }

  // 5. Origin / Referer validation against allowed domains
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : undefined);
  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({
      error: "Forbidden: Origin verification failed for mutating request.",
    });
    return;
  }

  next();
}
