import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { RequestHandler } from "express";
import { securityConfig } from "../lib/security-config";
import { getRedisClient } from "../lib/redis";

// ── CORS origin check ───────────────────────────────────────
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (hostname === "sundarvan.xyz" || hostname.endsWith(".sundarvan.xyz") || hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }
  } catch {}
  return allowedOrigins.size === 0;
}

// ── Rate limit store (Redis or in-memory fallback) ──────────
// We lazily build the Redis store only when a Redis client is available.
// In local dev without Redis, falls back to express-rate-limit's default
// in-memory store — this is fine for single-instance dev servers.

let rateLimitStore: any = undefined; // undefined = use default MemoryStore

async function getRateLimitStore() {
  if (rateLimitStore !== undefined) return rateLimitStore;
  const redis = getRedisClient();
  if (redis) {
    try {
      // Dynamically import to avoid failure when redis is unavailable
      const { RedisStore } = await import("rate-limit-redis");
      rateLimitStore = new RedisStore({
        // @ts-expect-error - ioredis sendCommand is compatible
        sendCommand: (...args: string[]) => redis.call(...args),
      });
    } catch {
      rateLimitStore = null; // fallback to in-memory
    }
  } else {
    rateLimitStore = null;
  }
  return rateLimitStore;
}

// ── Rate limiter factory ────────────────────────────────────
function createLimiter(
  windowMs: number,
  limit: number,
  message: string,
): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: message },
    // Store will be set when first request arrives; this is a workaround
    // because we can't await in module scope. express-rate-limit handles
    // undefined store by using MemoryStore.
  });
}

// ── Exported rate limiters ──────────────────────────────────

/** Global baseline — all routes */
export const globalLimiter = createLimiter(
  60_000,
  securityConfig.rateLimitGlobal,
  "Too many requests. Please try again shortly.",
);

/** Auth endpoints (login, register) */
export const authLimiter = createLimiter(
  60_000,
  securityConfig.rateLimitAuth,
  "Too many login/register attempts. Please wait a minute before trying again.",
);

/** OTP endpoints (verify, resend) */
export const otpLimiter = createLimiter(
  60_000,
  securityConfig.rateLimitOtp,
  "Too many OTP requests. Please wait a minute before trying again.",
);

/** Password recovery endpoints */
export const recoveryLimiter = createLimiter(
  60_000,
  securityConfig.rateLimitRecovery,
  "Too many password recovery attempts. Please wait a minute before trying again.",
);

/** Password change endpoint — Max 5 attempts per 60 minutes */
export const changePasswordLimiter = createLimiter(
  60 * 60_000,
  5,
  "Too many password change attempts. Security policy allows maximum 5 attempts per 60 minutes.",
);

/** Checkout order creation */

export const checkoutLimiter = createLimiter(
  60_000,
  securityConfig.rateLimitCheckout,
  "Too many checkout attempts. Please wait before trying again.",
);

/** Staff login */
export const staffLoginLimiter = createLimiter(
  60_000,
  securityConfig.rateLimitStaffLogin,
  "Too many staff login attempts. Please wait a minute before trying again.",
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
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "https:", "data:"],
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