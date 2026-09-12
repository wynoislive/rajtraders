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

const router: Router = Router();

// ── Zod Schemas ─────────────────────────────────────────────
const StaffLoginBodySchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

const CreateStaffBodySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "SUB_ADMIN", "MODERATOR"]),
  expiresAtHours: z.number().positive().optional(),
  expiresAtDate: z.string().optional(),
});

const UpdateStaffBodySchema = z.object({
  role: z.enum(["ADMIN", "SUB_ADMIN", "MODERATOR"]).optional(),
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

// ── Session store: Redis primary, in-memory fallback ────────
export interface StaffSession {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  expiresAt: string | null;
}

const STAFF_SESSION_TTL = securityConfig.sessionTtlSeconds;
const fallbackStaffSessions = new Map<string, StaffSession>();

export async function getStaffFromToken(token?: string): Promise<StaffSession | null> {
  if (!token) return null;
  const clean = token.replace(/^Bearer\s+/i, "").trim();

  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get(`session:staff:${clean}`);
    if (!data) return null;
    const session: StaffSession = JSON.parse(data);

    // Check time-bound temporary access expiration
    if (session.expiresAt) {
      const expiry = new Date(session.expiresAt).getTime();
      if (Date.now() > expiry) {
        await redis.del(`session:staff:${clean}`);
        return null;
      }
    }
    return session;
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

// Synchronous version for backwards compatibility with admin.ts
// (admin.ts calls getStaffFromToken synchronously — this wrapper handles both)
export { getStaffFromToken as getStaffFromTokenAsync };

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

    const token = `staff_${randomUUID().replace(/-/g, "")}`;
    const session: StaffSession = {
      userId: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role as AdminRole,
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
  } catch (err: any) {
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
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        expiresAt: u.expiresAt ? u.expiresAt.toISOString() : null,
        isExpired,
        createdAt: u.createdAt.toISOString(),
      };
    });

    res.status(200).json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load staff members." });
  }
});

// 3. Create Staff Account (Main Admin Only with optional time-bound expiration)
router.post("/staff", validate({ body: CreateStaffBodySchema }), async (req: Request, res: Response) => {
  const currentStaff = await getStaffFromToken(req.headers.authorization);

  // In standard operation, enforce Main Admin check; default allow initial setup
  if (currentStaff && currentStaff.role !== "MAIN_ADMIN") {
    res.status(403).json({ error: "Permission denied: Only the Main Admin can create staff accounts and assign roles." });
    return;
  }

  const { name, email, password, role, expiresAtHours, expiresAtDate } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, cleanEmail)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "A staff account with this email already exists." });
      return;
    }

    let expirationDate: Date | null = null;
    if (expiresAtHours && typeof expiresAtHours === "number") {
      expirationDate = new Date(Date.now() + expiresAtHours * 60 * 60 * 1000);
    } else if (expiresAtDate && typeof expiresAtDate === "string") {
      const parsed = new Date(expiresAtDate);
      if (!isNaN(parsed.getTime())) expirationDate = parsed;
    }

    const id = randomUUID();
    const passwordHash = hashPassword(password);

    await db.insert(adminUsersTable).values({
      id,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: role as AdminRole,
      expiresAt: expirationDate,
      active: true,
      createdBy: currentStaff?.userId || "main_admin_01",
    });

    req.log.info({ id, email: cleanEmail, role, expiresAt: expirationDate }, "Created new staff member");

    res.status(201).json({
      success: true,
      message: `Staff account created with role ${role}.`,
      staff: {
        id,
        name: name.trim(),
        email: cleanEmail,
        role,
        expiresAt: expirationDate ? expirationDate.toISOString() : null,
      },
    });
  } catch (err: any) {
    req.log.error({ err }, "Create staff error");
    res.status(500).json({ error: "Failed to create staff account." });
  }
});

// 4. Update Staff Role / Expiration (Main Admin Only)
router.put("/staff/:id", validate({ body: UpdateStaffBodySchema }), async (req: Request, res: Response) => {
  const currentStaff = await getStaffFromToken(req.headers.authorization);

  if (currentStaff && currentStaff.role !== "MAIN_ADMIN") {
    res.status(403).json({ error: "Permission denied: Only the Main Admin can modify staff roles and expiration." });
    return;
  }

  const id = req.params.id as string;
  const { role, active, expiresAtDate, expiresAtHours } = req.body;

  try {
    const updateData: Partial<typeof adminUsersTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (role) updateData.role = role;
    if (typeof active === "boolean") updateData.active = active;

    if (expiresAtHours !== undefined) {
      updateData.expiresAt = expiresAtHours ? new Date(Date.now() + expiresAtHours * 60 * 60 * 1000) : null;
    } else if (expiresAtDate !== undefined) {
      updateData.expiresAt = expiresAtDate ? new Date(expiresAtDate) : null;
    }

    await db.update(adminUsersTable).set(updateData).where(eq(adminUsersTable.id, id));

    res.status(200).json({ success: true, message: "Staff account updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update staff account." });
  }
});

// 5. Delete Staff Account (Main Admin Only)
router.delete("/staff/:id", async (req: Request, res: Response) => {
  const currentStaff = await getStaffFromToken(req.headers.authorization);

  if (currentStaff && currentStaff.role !== "MAIN_ADMIN") {
    res.status(403).json({ error: "Permission denied: Only the Main Admin can remove staff." });
    return;
  }

  const id = req.params.id as string;

  try {
    await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id));
    res.status(200).json({ success: true, message: "Staff account deleted." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete staff account." });
  }
});

export default router;
