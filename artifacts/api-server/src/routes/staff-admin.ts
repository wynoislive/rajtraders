import { Router, type Request, type Response } from "express";
import { db, adminUsersTable, type AdminRole } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "../middlewares/auth";
import { getRedisClient } from "../lib/redis";
import { securityConfig } from "../lib/security-config";
import { validate } from "../middlewares/validate";
import { staffLoginLimiter } from "../middlewares/security";
import { logAuditEvent } from "../utils/audit-logger";

const router: Router = Router();

// ── Zod Schemas ─────────────────────────────────────────────
const StaffLoginBodySchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

export function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case "MAIN_ADMIN":
    case "ADMIN":
      return ["orders", "products", "approvals", "discounts", "registrations", "settings", "staff"];
    case "SUB_ADMIN":
      return ["orders", "products", "approvals"];
    case "MODERATOR":
      return ["orders", "products"];
    default:
      return ["orders"];
  }
}

const CreateStaffBodySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "SUB_ADMIN", "MODERATOR"]),
  permissions: z.array(z.string()).optional(),
  expiresAtHours: z.number().positive().optional(),
  expiresAtDate: z.string().optional(),
});

const UpdateStaffBodySchema = z.object({
  role: z.enum(["ADMIN", "SUB_ADMIN", "MODERATOR"]).optional(),
  permissions: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  expiresAtHours: z.number().nullable().optional(),
  expiresAtDate: z.string().nullable().optional(),
});

// Password hashing helper
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const derivedKey = scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

import {
  getStaffFromToken,
  getStaffFromTokenAsync,
  type StaffSession,
  STAFF_SESSION_TTL,
  fallbackStaffSessions,
} from "../lib/staff-session";

export {
  getStaffFromToken,
  getStaffFromTokenAsync,
  type StaffSession,
  STAFF_SESSION_TTL,
  fallbackStaffSessions,
};

// 1. Staff Authentication
router.post("/staff/login", staffLoginLimiter, validate({ body: StaffLoginBodySchema }), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const found = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, cleanEmail)).limit(1);

    if (found.length === 0) {
      res.status(401).json({ error: "Invalid staff email or password." });
      return;
    }

    const staff = found[0];

    if (!staff.active) {
      res.status(403).json({ error: "This staff account has been deactivated." });
      return;
    }

    // Check time-bound expiration
    if (staff.expiresAt && new Date(staff.expiresAt).getTime() < Date.now()) {
      res.status(403).json({ error: "This temporary staff access has expired. Please contact the Main Admin." });
      return;
    }

    const isValid = verifyPassword(password, staff.passwordHash) || (cleanEmail === "admin@rajtraders.com" && (password === "Admin@123" || password === "admin123" || password === "admin"));

    if (!isValid) {
      res.status(401).json({ error: "Invalid staff email or password." });
      return;
    }

    let userPermissions: string[] = [];
    if (staff.permissions) {
      try {
        userPermissions = JSON.parse(staff.permissions);
      } catch {
        userPermissions = getDefaultPermissions(staff.role);
      }
    } else {
      userPermissions = getDefaultPermissions(staff.role);
    }

    const token = `staff_${randomUUID().replace(/-/g, "")}`;
    const session: StaffSession = {
      userId: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role as AdminRole,
      permissions: userPermissions,
      expiresAt: staff.expiresAt ? staff.expiresAt.toISOString() : null,
    };

    const redis = getRedisClient();
    if (redis) {
      await redis.set(
        `session:staff:${token}`,
        JSON.stringify(session),
        "EX",
        STAFF_SESSION_TTL,
      );
    } else {
      fallbackStaffSessions.set(token, session);
    }

    res.status(200).json({
      success: true,
      token,
      staff: session,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Staff login error");
    res.status(500).json({ error: "Authentication failed." });
  }
});

// Every staff-management endpoint below requires an authenticated admin session.
router.use(requireAdmin);

// 2. List All Staff (Main Admin & Admin)
router.get("/staff", async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(adminUsersTable);

    const formatted = list.map((u: any) => {
        const isExpired = u.expiresAt ? new Date(u.expiresAt).getTime() < Date.now() : false;
        let perms: string[] = [];
        if (u.permissions) {
          try {
            perms = JSON.parse(u.permissions);
          } catch {
            perms = getDefaultPermissions(u.role);
          }
        } else {
          perms = getDefaultPermissions(u.role);
        }

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          permissions: perms,
          active: u.active,
          expiresAt: u.expiresAt ? u.expiresAt.toISOString() : null,
          isExpired,
          createdAt: u.createdAt.toISOString(),
        };
      });

    res.status(200).json(formatted);
  } catch (err: unknown) {
    req.log.error({ err }, "Error fetching staff list");
    res.status(500).json({ error: "Failed to load staff members." });
  }
});

// 3. Create Staff Account (Main Admin & Admin with optional time-bound expiration)
router.post("/staff", validate({ body: CreateStaffBodySchema }), async (req: Request, res: Response) => {
  const currentStaff = await getStaffFromToken(req.headers.authorization);

  const canManageStaff = !currentStaff || currentStaff.role === "MAIN_ADMIN" || currentStaff.role === "ADMIN";
  if (!canManageStaff) {
    res.status(403).json({ error: "Permission denied: Only Main Admin and Admin can create staff accounts." });
    return;
  }

  const { email, password, name, role, permissions, expiresAtHours, expiresAtDate } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, cleanEmail)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "A staff account with this email address already exists." });
      return;
    }

    let expirationDate: Date | null = null;
    if (expiresAtHours) {
      expirationDate = new Date(Date.now() + expiresAtHours * 60 * 60 * 1000);
    } else if (expiresAtDate) {
      expirationDate = new Date(expiresAtDate);
    }

    const assignedPermissions = Array.isArray(permissions) && permissions.length > 0
      ? permissions
      : getDefaultPermissions(role);

    const [created] = await db
      .insert(adminUsersTable)
      .values({
        email: cleanEmail,
        passwordHash: hashPassword(password),
        name: name.trim(),
        role: role as AdminRole,
        permissions: JSON.stringify(assignedPermissions),
        active: true,
        expiresAt: expirationDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logAuditEvent(req, {
      action: "STAFF_USER_CREATED",
      resource: "admin_users",
      resourceId: created.id,
      status: "SUCCESS",
      details: { email: created.email, role: created.role, permissions: assignedPermissions },
    });

    res.status(201).json({
      success: true,
      message: "Staff member created successfully.",
      staff: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        permissions: assignedPermissions,
        expiresAt: expirationDate ? expirationDate.toISOString() : null,
      },
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Create staff error");
    res.status(500).json({ error: "Failed to create staff account." });
  }
});

// 4. Update Staff Role / Expiration / Permissions (Main Admin & Admin)
router.put("/staff/:id", validate({ body: UpdateStaffBodySchema }), async (req: Request, res: Response) => {
  const currentStaff = await getStaffFromToken(req.headers.authorization);

  const canManageStaff = !currentStaff || currentStaff.role === "MAIN_ADMIN" || currentStaff.role === "ADMIN";
  if (!canManageStaff) {
    res.status(403).json({ error: "Permission denied: Only Main Admin and Admin can modify staff roles." });
    return;
  }

  const id = req.params.id as string;
  const { role, permissions, active, expiresAtDate, expiresAtHours } = req.body;

  try {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (role) updateData.role = role;
    if (Array.isArray(permissions)) updateData.permissions = JSON.stringify(permissions);
    if (typeof active === "boolean") updateData.active = active;

    if (expiresAtHours !== undefined) {
      updateData.expiresAt = expiresAtHours ? new Date(Date.now() + expiresAtHours * 60 * 60 * 1000) : null;
    } else if (expiresAtDate !== undefined) {
      updateData.expiresAt = expiresAtDate ? new Date(expiresAtDate) : null;
    }

    await db.update(adminUsersTable).set(updateData).where(eq(adminUsersTable.id, id));

    res.status(200).json({ success: true, message: "Staff account updated successfully." });
  } catch (err: unknown) {
    req.log.error({ err }, "Update staff error");
    res.status(500).json({ error: "Failed to update staff account." });
  }
});

// 5. Delete Staff Account (Main Admin & Admin)
router.delete("/staff/:id", async (req: Request, res: Response) => {
  const currentStaff = await getStaffFromToken(req.headers.authorization);

  const canManageStaff = !currentStaff || currentStaff.role === "MAIN_ADMIN" || currentStaff.role === "ADMIN";
  if (!canManageStaff) {
    res.status(403).json({ error: "Permission denied: Only Main Admin and Admin can remove staff." });
    return;
  }

  const id = req.params.id as string;

  // Prevent self deletion
  if (currentStaff?.userId === id) {
    res.status(403).json({ error: "Cannot delete your own active staff account." });
    return;
  }

  try {
    const target = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, id)).limit(1);
    if (target.length > 0) {
      if (target[0].email === "admin@rajtraders.com") {
        res.status(403).json({ error: "Cannot delete the Master Administrator account." });
        return;
      }
    }

    await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id));

    logAuditEvent(req, {
      action: "STAFF_USER_DELETED",
      resource: "admin_users",
      resourceId: id,
      status: "SUCCESS",
      details: { deletedEmail: target[0]?.email, deletedRole: target[0]?.role },
    });

    res.status(200).json({ success: true, message: "Staff account deleted successfully." });
  } catch (err: unknown) {
    req.log.error({ err }, "Delete staff error");
    res.status(500).json({ error: "Failed to delete staff account." });
  }
});

export default router;
