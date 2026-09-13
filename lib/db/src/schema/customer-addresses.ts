import { boolean, index, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const customerAddressesTable = pgTable(
  "customer_addresses",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id").notNull(),
    label: text("label").notNull().default("Home"), // Home, Work, Other
    fullAddress: text("full_address").notNull(),
    houseNumber: text("house_number").default(""),
    buildingSociety: text("building_society").default(""),
    landmark: text("landmark").default(""),
    pincode: text("pincode").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default("Madhya Pradesh"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    deliveryInstructions: text("delivery_instructions").default(""),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_addresses_user_id").on(table.userId),
  ],
);

export type CustomerAddress = typeof customerAddressesTable.$inferSelect;
export type InsertCustomerAddress = typeof customerAddressesTable.$inferInsert;
