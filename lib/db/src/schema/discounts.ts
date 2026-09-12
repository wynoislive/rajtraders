import { integer, pgTable, text, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const discountsTable = pgTable("discounts", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("percentage"),
  value: real("value").notNull(),
  minimumSubtotalCents: integer("minimum_subtotal_cents").notNull().default(0),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  firstOrderOnly: boolean("first_order_only").notNull().default(false),
});

export type Discount = typeof discountsTable.$inferSelect;
export type InsertDiscount = typeof discountsTable.$inferInsert;