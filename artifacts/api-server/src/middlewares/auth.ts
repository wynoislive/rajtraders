import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { getStaffFromToken } from "../lib/staff-session";

const configuredAdminIds = new Set(
  (process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check Staff session token (e.g., Bearer staff_...)
  if (authHeader) {
    try {
      const staffSession = await getStaffFromToken(authHeader);
      if (staffSession) {
        (req as any).staff = staffSession;
        req.log?.info?.({ staffId: staffSession.userId, role: staffSession.role }, "Authenticated staff admin request");
        return next();
      }
    } catch (err) {
      req.log?.warn?.({ err }, "Error validating staff token");
    }
  }

  // 2. Check Clerk session authentication if secret key configured
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const auth = getAuth(req);
      const userId = "userId" in auth ? auth.userId : undefined;
      if (userId) {
        if (configuredAdminIds.size > 0 && !configuredAdminIds.has(userId)) {
          res.status(403).json({ error: "Admin access required." });
          return;
        }
        req.log?.info?.({ userId }, "Authenticated Clerk admin request");
        return next();
      }
    } catch (err) {
      // Fall through to 401 response below
    }

    res.status(401).json({ error: "Authentication required." });
    return;
  }

  // 3. Fallback for local development or when auth tokens are optional
  next();
};