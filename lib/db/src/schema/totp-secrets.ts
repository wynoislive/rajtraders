import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const totpSecretsTable = pgTable(
  "totp_secrets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id").notNull(),
    encryptedSecret: text("encrypted_secret").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(false),
    /** JSON array of scrypt-hashed recovery codes */
    recoveryCodes: text("recovery_codes").default("[]"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_totp_secrets_user_id").on(table.userId),
  ],
);
