import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const adminRoles = ["MAIN_ADMIN", "ADMIN", "SUB_ADMIN", "MODERATOR"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const adminUsersTable = pgTable("admin_users", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("ADMIN"), // 'MAIN_ADMIN' | 'ADMIN' | 'SUB_ADMIN' | 'MODERATOR'
  permissions: text("permissions"), // JSON stringified array of permitted modules e.g. ["orders","products","approvals"]
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = permanent, set date = temporary time-bound access
  active: boolean("active").notNull().default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminUser = typeof adminUsersTable.$inferSelect;
export type InsertAdminUser = typeof adminUsersTable.$inferInsert;
