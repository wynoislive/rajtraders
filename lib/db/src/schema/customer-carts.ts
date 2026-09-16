import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const customerCartsTable = pgTable("customer_carts", {
  userId: text("user_id").primaryKey(),
  itemsJson: text("items_json").notNull().default("[]"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomerCart = typeof customerCartsTable.$inferSelect;
export type InsertCustomerCart = typeof customerCartsTable.$inferInsert;
