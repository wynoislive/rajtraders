/**
 * Centralised, env-configurable security parameters.
 * Every value has a sensible default — override via .env or process.env.
 */

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw.toLowerCase() === "true" || raw === "1";
}

function envStr(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

const isProduction = process.env.NODE_ENV === "production";

export const securityConfig = {
  /** Global rate limit — requests per minute per IP */
  rateLimitGlobal: envInt("RATE_LIMIT_GLOBAL", 120),
  /** Auth endpoints (login/register) — requests per minute per IP */
  rateLimitAuth: envInt("RATE_LIMIT_AUTH", 10),
  /** OTP endpoints (verify/resend) — requests per minute per IP */
  rateLimitOtp: envInt("RATE_LIMIT_OTP", 5),
  /** Recovery endpoints (forgot/reset password) — requests per minute per IP */
  rateLimitRecovery: envInt("RATE_LIMIT_RECOVERY", 3),
  /** Checkout order creation — requests per minute per IP */
  rateLimitCheckout: envInt("RATE_LIMIT_CHECKOUT", 20),
  /** Staff login — requests per minute per IP */
  rateLimitStaffLogin: envInt("RATE_LIMIT_STAFF_LOGIN", 5),

  /** Maximum request body size (Express body-parser format, e.g. "1mb") */
  bodySizeLimit: envStr("BODY_SIZE_LIMIT", "1mb"),

  /** Whether to enable HSTS header (default: true in production) */
  hstsEnabled: envBool("HSTS_ENABLED", isProduction),
  /** HSTS max-age in seconds (default: 1 year) */
  hstsMaxAge: envInt("HSTS_MAX_AGE", 31_536_000),

  /** Whether to enable Content-Security-Policy header (default: true in production) */
  cspEnabled: envBool("CSP_ENABLED", isProduction),

  /** Session TTL in days */
  sessionTtlDays: envInt("SESSION_TTL_DAYS", 30),

  /** Session TTL in milliseconds (derived) */
  get sessionTtlMs(): number {
    return this.sessionTtlDays * 24 * 60 * 60 * 1000;
  },

  /** Session TTL in seconds (for Redis EX) */
  get sessionTtlSeconds(): number {
    return this.sessionTtlDays * 24 * 60 * 60;
  },
} as const;
