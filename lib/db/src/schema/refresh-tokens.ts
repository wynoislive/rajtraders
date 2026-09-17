import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { usersTable } from "./users";

export const refreshTokensTable = pgTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    familyId: text("family_id").notNull(),
    deviceFingerprint: text("device_fingerprint"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_refresh_tokens_user_id").on(table.userId),
    index("idx_refresh_tokens_token_hash").on(table.tokenHash),
    index("idx_refresh_tokens_family_id").on(table.familyId),
    index("idx_refresh_tokens_expires_at").on(table.expiresAt),
  ]
);

export type RefreshToken = typeof refreshTokensTable.$inferSelect;
export type NewRefreshToken = typeof refreshTokensTable.$inferInsert;
