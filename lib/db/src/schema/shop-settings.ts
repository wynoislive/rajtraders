import { boolean, pgTable, real, text, timestamp, integer } from "drizzle-orm/pg-core";

export const shopSettingsTable = pgTable("shop_settings", {
  id: text("id").primaryKey().$defaultFn(() => "default_shop"),
  shopName: text("shop_name").notNull().default("RAJ TRADERS"),
  shopDomain: text("shop_domain").notNull().default("sundarvan.xyz"),
  shopAddress: text("shop_address").notNull().default("123 Baker Street, Mumbai"),
  latitude: real("latitude").notNull().default(19.0760),
  longitude: real("longitude").notNull().default(72.8777),
  deliveryRadiusKm: real("delivery_radius_km").notNull().default(15.0),
  isDeliveryEnabled: boolean("is_delivery_enabled").notNull().default(true),
  razorpayKeyId: text("razorpay_key_id").notNull().default("rzp_test_sandbox123456"),
  razorpayKeySecret: text("razorpay_key_secret").notNull().default("sandbox_secret"),
  // Cloudflare R2 Free-Tier Storage Config
  r2AccountId: text("r2_account_id").default(""),
  r2AccessKeyId: text("r2_access_key_id").default(""),
  r2SecretAccessKey: text("r2_secret_access_key").default(""),
  r2BucketName: text("r2_bucket_name").default("rajtraders-products"),
  r2PublicUrl: text("r2_public_url").default("https://pub-r2.rajtraders.shop"),
  // Nodemailer Hostinger SMTP Config & Multi-Mailbox Setup
  smtpHost: text("smtp_host").default("smtp.hostinger.com"),
  smtpPort: integer("smtp_port").default(465),
  smtpUser: text("smtp_user").default("wyno@justbuyme.in"),
  smtpPass: text("smtp_pass").default(""),
  smtpFrom: text("smtp_from").default("RAJ TRADERS <wyno@justbuyme.in>"),
  // Multi-Mailbox Addresses (Admin Configurable)
  supportEmail: text("support_email").default("support@sundarvan.xyz"),
  contactEmail: text("contact_email").default("contact@sundarvan.xyz"),
  ordersEmail: text("orders_email").default("orders@sundarvan.xyz"),
  // Hostinger Mail REST API Config (Primary HTTPS Sender)
  hostingerApiToken: text("hostinger_api_token").default(""),
  hostingerMailboxResourceId: text("hostinger_mailbox_resource_id").default(""),
  // Dedicated System Notifications Mailer (Gmail / Custom Nodemailer SMTP)
  notificationSmtpHost: text("notification_smtp_host").default("smtp.gmail.com"),
  notificationSmtpPort: integer("notification_smtp_port").default(465),
  notificationSmtpUser: text("notification_smtp_user").default("notifications.rajtraders@gmail.com"),
  notificationSmtpPass: text("notification_smtp_pass").default(""),
  notificationSmtpFrom: text("notification_smtp_from").default("RAJ TRADERS Notifications <notifications.rajtraders@gmail.com>"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ShopSettings = typeof shopSettingsTable.$inferSelect;
export type InsertShopSettings = typeof shopSettingsTable.$inferInsert;
