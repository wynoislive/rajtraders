import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { getDb, runWithDbContext } from "@workspace/db";

const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  "raj_traders_sticky_db_routing_secret_salt_2026";

const WRITE_STICKY_WINDOW_MS = 5000; // 5 seconds Read-Your-Own-Writes cooldown

function signTimestamp(timestamp: string): string {
  return createHmac("sha256", TOKEN_SECRET).update(timestamp).digest("hex").slice(0, 16);
}

export function generateWriteToken(): string {
  const ts = Date.now().toString();
  const sig = signTimestamp(ts);
  return `${ts}.${sig}`;
}

export function validateWriteToken(token: string | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [tsStr, signature] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;

  const age = Date.now() - ts;
  if (age < 0 || age > WRITE_STICKY_WINDOW_MS) {
    return false;
  }

  const expectedSig = signTimestamp(tsStr);
  if (expectedSig.length !== signature.length) return false;

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

// Critical routes that must always be pinned to the Primary database pool
const CRITICAL_PRIMARY_PREFIXES = [
  "/api/v1/checkout/create-order",
  "/api/v1/checkout/verify-payment",
  "/api/v1/checkout/webhook",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/delete-account",
  "/api/v1/admin/shop-settings",
];

export function dbRoutingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. Inspect recent write tokens from header or cookie
  const incomingHeader = req.headers["x-db-recent-write"] as string | undefined;
  const incomingCookie = (req as any).cookies?.["x-db-recent-write"];
  const rawToken = incomingHeader || incomingCookie;
  const hasRecentWrite = validateWriteToken(rawToken);

  // 2. Determine if request is a write mutation or critical ACID path
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase());
  const isCriticalPath = CRITICAL_PRIMARY_PREFIXES.some((prefix) => req.originalUrl?.startsWith(prefix));
  const forcePrimary = isMutation || isCriticalPath || hasRecentWrite;

  // 3. For write mutations, emit a fresh sticky token on response so immediate follow-up reads pin to Primary
  if (isMutation) {
    const newToken = generateWriteToken();
    res.setHeader("x-db-recent-write", newToken);
    const existingExposed = res.getHeader("Access-Control-Expose-Headers") || "";
    const exposedStr = typeof existingExposed === "string" ? existingExposed : "";
    if (!exposedStr.includes("x-db-recent-write")) {
      res.setHeader(
        "Access-Control-Expose-Headers",
        exposedStr ? `${exposedStr}, x-db-recent-write` : "x-db-recent-write",
      );
    }

    if (typeof (res as any).cookie === "function") {
      (res as any).cookie("x-db-recent-write", newToken, {
        maxAge: WRITE_STICKY_WINDOW_MS,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
  }

  // 4. Attach request metadata
  (req as any).isDbPinnedToPrimary = forcePrimary;
  (req as any).hasRecentWrite = hasRecentWrite;
  (req as any).db = getDb({ forcePrimary, hasRecentWrite, requestId: (req as any).id });

  // 5. Run downstream handlers inside AsyncLocalStorage context
  runWithDbContext(
    {
      forcePrimary,
      hasRecentWrite,
      requestId: (req as any).id,
    },
    () => next(),
  );
}
