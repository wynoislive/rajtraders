import { pgTable, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

// Play Store Account Deletion Log with 15-day penalty tracking
export const deletedAccountsLogTable = pgTable(
  "deleted_accounts_log",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    email: text("email").notNull(),
    mobileNumber: text("mobile_number").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
    penaltyExpiresAt: timestamp("penalty_expires_at", { withTimezone: true }).notNull(), // deletedAt + 15 days
  },
  (table) => [
    index("idx_deleted_accounts_email").on(table.email),
  ],
);

// Password Recovery with 60-Minute Token Validity
export const passwordResetsTable = pgTable(
  "password_resets",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // exactly 60 minutes
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_password_resets_email_token").on(table.email, table.tokenHash),
    index("idx_password_resets_expires_at").on(table.expiresAt),
  ],
);

// 15-20 Minute Post-Reset Lockout Table to Prevent Spam & Brute-Force
export const passwordLockoutsTable = pgTable("password_lockouts", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  email: text("email").notNull().unique(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Login Email OTP Verifications (Nodemailer 6-digit verification code, 10-min validity)
export const emailVerificationsTable = pgTable(
  "email_verifications",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    otpCode: text("otp_code").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // 10 minutes
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_email_verifications_email").on(table.email),
    index("idx_email_verifications_expires_at").on(table.expiresAt),
  ],
);

export type DeletedAccountLog = typeof deletedAccountsLogTable.$inferSelect;
export type PasswordReset = typeof passwordResetsTable.$inferSelect;
export type PasswordLockout = typeof passwordLockoutsTable.$inferSelect;
export type EmailVerification = typeof emailVerificationsTable.$inferSelect;
