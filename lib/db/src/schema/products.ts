import { integer, pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const productsTable = pgTable(
  "products",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    priceCents: integer("price_cents").notNull(),
    compareAtPriceCents: integer("compare_at_price_cents"),
    category: text("category").notNull(),
    imageUrl: text("image_url").notNull(),
    status: text("status").notNull().default("active"),
    featured: boolean("featured").notNull().default(false),
    inventory: integer("inventory").notNull().default(0),
    prepTimeMinutes: integer("prep_time_minutes").notNull().default(30),
    isBestseller: boolean("is_bestseller").notNull().default(false),
    isVeg: boolean("is_veg").notNull().default(true),
    approvalStatus: text("approval_status").notNull().default("approved"), // 'approved', 'pending_approval', 'rejected'
    submittedBy: text("submitted_by"),
    approvedBy: text("approved_by"),
    rejectionReason: text("rejection_reason"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },

  (table) => [
    index("idx_products_status_approval").on(table.status, table.approvalStatus),
    index("idx_products_slug").on(table.slug),
    index("idx_products_category").on(table.category),
  ],
);

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;