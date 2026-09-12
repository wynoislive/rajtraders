import { text, pgTable, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const registrationClaimsTable = pgTable("registration_claims", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  email: text("email").notNull().unique(),
  policyId: text("policy_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RegistrationClaim = typeof registrationClaimsTable.$inferSelect;