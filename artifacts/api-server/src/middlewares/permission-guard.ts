import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { StaffSession } from "../lib/staff-session";

declare global {
  namespace Express {
    interface Request {
      staff?: StaffSession;
    }
  }
}

/**
 * Granular Role-Based Access Control (RBAC) middleware.
 *
 * Rules:
 * 1. MAIN_ADMIN and ADMIN roles possess universal access across all modules.
 * 2. SUB_ADMIN and MODERATOR must have the target module in their `staff.permissions` array.
 * 3. Unauthenticated requests are rejected with 401; unauthorized with 403.
 */
export function requirePermission(module: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const staff = req.staff;

    if (!staff) {
      res.status(401).json({ error: "Authentication required. Valid staff session required." });
      return;
    }

    // Universal super-admin bypass
    if (staff.role === "MAIN_ADMIN" || staff.role === "ADMIN") {
      return next();
    }

    // Granular module permission check
    const hasPermission = Array.isArray(staff.permissions) && staff.permissions.includes(module);

    if (!hasPermission) {
      req.log?.warn?.(
        {
          staffId: staff.userId,
          role: staff.role,
          requestedModule: module,
          grantedPermissions: staff.permissions,
        },
        "Forbidden: Staff account lacks permission for requested module"
      );

      res.status(403).json({
        error: `Forbidden: You do not have permissions to access the '${module}' module. Contact an administrator.`,
      });
      return;
    }

    next();
  };
}
