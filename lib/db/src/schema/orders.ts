import { integer, pgTable, real, text, timestamp, index } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const ordersTable = pgTable(
  "orders",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    razorpayOrderId: text("razorpay_order_id").notNull().unique(),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpaySignature: text("razorpay_signature"),
    userId: text("user_id"),
    customerEmail: text("customer_email"),
    customerName: text("customer_name"),
    customerMobile: text("customer_mobile"),
    shippingAddress: text("shipping_address"),
    deliveryLatitude: real("delivery_latitude"),
    deliveryLongitude: real("delivery_longitude"),
    deliveryDistanceKm: real("delivery_distance_km"),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("created"),
    itemsJson: text("items_json").notNull().default("[]"),
    // Local Fleet Rider & Logistics
    riderName: text("rider_name"),
    riderPhone: text("rider_phone"),
    dispatchSlot: text("dispatch_slot"),
    trackingUrl: text("tracking_url"),
    // Cancellation & Refund Flow
    cancellationStatus: text("cancellation_status").notNull().default("none"),
    cancellationReason: text("cancellation_reason"),
    preferredRefundMethod: text("preferred_refund_method"),
    refundId: text("refund_id"),
    refundAmountCents: integer("refund_amount_cents"),
    // Reverse GST Breakdown & Fees
    taxableAmountCents: integer("taxable_amount_cents"),
    cgstCents: integer("cgst_cents"),
    sgstCents: integer("sgst_cents"),
    igstCents: integer("igst_cents"),
    shippingFeeCents: integer("shipping_fee_cents").notNull().default(0),
    packagingFeeCents: integer("packaging_fee_cents").notNull().default(0),
    // Timestamps for Order Progress Tracking
    packedAt: timestamp("packed_at", { withTimezone: true }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_orders_user_id").on(table.userId),
    index("idx_orders_status").on(table.status),
    index("idx_orders_created_at").on(table.createdAt),
  ],
);

export type Order = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
