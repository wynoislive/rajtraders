import { integer, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const registrationPoliciesTable = pgTable("registration_policies", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  name: text("name").notNull(),
  description: text("description").notNull(),
  offerCode: text("offer_code").notNull(),
  active: boolean("active").notNull().default(true),
  windowDays: integer("window_days").notNull().default(14),
  registrationsCount: integer("registrations_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RegistrationPolicy = typeof registrationPoliciesTable.$inferSelect;
export type InsertRegistrationPolicy = typeof registrationPoliciesTable.$inferInsert;