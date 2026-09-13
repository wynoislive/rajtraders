import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const customerNotificationsTable = pgTable(
  "customer_notifications",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull().default("system"), // order_update, promo, system
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_notifications_user_id").on(table.userId),
    index("idx_customer_notifications_is_read").on(table.isRead),
  ],
);

export type CustomerNotification = typeof customerNotificationsTable.$inferSelect;
export type InsertCustomerNotification = typeof customerNotificationsTable.$inferInsert;
