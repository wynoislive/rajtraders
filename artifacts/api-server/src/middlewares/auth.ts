import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

const configuredAdminIds = new Set(
  (process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!process.env.CLERK_SECRET_KEY) {
    return next();
  }
  try {
    const auth = getAuth(req);
    const userId = "userId" in auth ? auth.userId : undefined;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (configuredAdminIds.size > 0 && !configuredAdminIds.has(userId)) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    req.log.info({ userId }, "Authenticated admin request");
    next();
  } catch (err) {
    res.status(401).json({ error: "Authentication required." });
  }
};