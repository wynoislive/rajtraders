import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { RequestHandler, Request } from "express";
import { securityConfig } from "../lib/security-config";
import { getRedisClient } from "../lib/redis";

// ── CORS origin check ───────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

const TRUSTED_PRODUCTION_HOSTS = new Set([
  "sundarvan.xyz",
  "admin.sundarvan.xyz",
  "api.sundarvan.xyz",
]);

export function isAllowedOrigin(origin: string | undefined): boolean {
  // Allow non-browser requests without Origin header (e.g. mobile app or server-to-server)
  if (!origin) return true;

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const originLower = origin.toLowerCase().replace(/\/$/, "");

    if (allowedOrigins.has(originLower)) return true;

    // Production domain & subdomains (must be HTTPS)
    if (TRUSTED_PRODUCTION_HOSTS.has(hostname) || hostname.endsWith(".sundarvan.xyz")) {
      return parsed.protocol === "https:";
    }

    // Localhost only in non-production environments
    if (!isProduction && (hostname === "localhost" || hostname === "127.0.0.1")) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

import { RedisStore } from "rate-limit-redis";

// ── Composite Key Generator ─────────────────────────────────
export function resolveCompositeKey(req: Request): string {
  // 1. Authenticated Staff session
  if ((req as any).staff?.userId) {
    return `staff:${(req as any).staff.userId}`;
  }

  // 2. Customer or other Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      return `auth:${token.slice(0, 32)}`;
    }
  }

  // 3. Fallback to client IP (respecting forward proxies if present)
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip || req.socket?.remoteAddress || "127.0.0.1";
  return `ip:${ip}`;
}

// ── Distributed Rate Limiter Factory ────────────────────────
export function createDistributedLimiter(
  windowMs: number,
  limit: number,
  message: string,
  prefix = "default",
): RequestHandler {
  const redis = getRedisClient();
  const store = redis
    ? new RedisStore({
        // @ts-expect-error - ioredis sendCommand is compatible
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: `rl:${prefix}:`,
      })
    : undefined;

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: resolveCompositeKey,
    store,
    message: { error: message },
  });
}

// ── Exported rate limiters ──────────────────────────────────

/** Global baseline — all routes */
export const globalLimiter = createDistributedLimiter(
  60_000,
  securityConfig.rateLimitGlobal,
  "Too many requests. Please try again shortly.",
  "global",
);

/** Auth endpoints (login, register) */
export const authLimiter = createDistributedLimiter(
  60_000,
  securityConfig.rateLimitAuth,
  "Too many login/register attempts. Please wait a minute before trying again.",
  "auth",
);

/** OTP endpoints (verify, resend) */
export const otpLimiter = createDistributedLimiter(
  60_000,
  securityConfig.rateLimitOtp,
  "Too many OTP requests. Please wait a minute before trying again.",
  "otp",
);

/** Password recovery endpoints */
export const recoveryLimiter = createDistributedLimiter(
  60_000,
  securityConfig.rateLimitRecovery,
  "Too many password recovery attempts. Please wait a minute before trying again.",
  "recovery",
);

/** Password change endpoint — Max 5 attempts per 60 minutes */
export const changePasswordLimiter = createDistributedLimiter(
  60 * 60_000,
  5,
  "Too many password change attempts. Security policy allows maximum 5 attempts per 60 minutes.",
  "pwd-change",
);

/** Checkout order creation */

export const checkoutLimiter = createDistributedLimiter(
  60_000,
  securityConfig.rateLimitCheckout,
  "Too many checkout attempts. Please wait before trying again.",
  "checkout",
);

/** Staff login */
export const staffLoginLimiter = createDistributedLimiter(
  60_000,
  securityConfig.rateLimitStaffLogin,
  "Too many staff login attempts. Please wait a minute before trying again.",
  "staff-login",
);

// ── Helmet + security headers ───────────────────────────────
export const secureGateway: RequestHandler[] = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // HSTS — configurable via env
    strictTransportSecurity: securityConfig.hstsEnabled
      ? { maxAge: securityConfig.hstsMaxAge, includeSubDomains: true }
      : false,
    // CSP — configurable via env
    contentSecurityPolicy: securityConfig.cspEnabled
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: [
              "'self'",
              "data:",
              "https://sundarvan.xyz",
              "https://*.sundarvan.xyz",
              "https://*.r2.cloudflarestorage.com",
              "https://images.unsplash.com",
            ],
            connectSrc: [
              "'self'",
              "https://api.sundarvan.xyz",
              "https://*.supabase.co",
              "https://api.razorpay.com",
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        }
      : false,
  }),
  globalLimiter,
];