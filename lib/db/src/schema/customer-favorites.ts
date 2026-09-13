import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const customerFavoritesTable = pgTable(
  "customer_favorites",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id").notNull(),
    productId: text("product_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_favorites_user_id").on(table.userId),
    uniqueIndex("idx_customer_favorites_user_product").on(table.userId, table.productId),
  ],
);

export type CustomerFavorite = typeof customerFavoritesTable.$inferSelect;
export type InsertCustomerFavorite = typeof customerFavoritesTable.$inferInsert;
