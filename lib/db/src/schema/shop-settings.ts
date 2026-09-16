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
  // Footer, Social & Operational Settings
  socialLinkedin: text("social_linkedin").default(""),
  socialInstagram: text("social_instagram").default(""),
  socialFacebook: text("social_facebook").default(""),
  socialPinterest: text("social_pinterest").default(""),
  socialTwitter: text("social_twitter").default(""),
  availableInLocation: text("available_in_location").default("BIRSINGPUR PALI"),
  aboutUsText: text("about_us_text").default("Premium cakes, party decorations & artisanal local delights."),
  isStoreOpen: boolean("is_store_open").notNull().default(true),
  minOrderCents: integer("min_order_cents").default(0),
  isCodEnabled: boolean("is_cod_enabled").notNull().default(false),
  flatDeliveryFeeCents: integer("flat_delivery_fee_cents").default(3000), // ₹30
  freeDeliveryThresholdCents: integer("free_delivery_threshold_cents").default(50000), // ₹500
  packagingFeeCents: integer("packaging_fee_cents").default(1000), // ₹10
  // Business GST, Legal Identity & Local Serviceability
  legalBusinessName: text("legal_business_name").default("RAJ TRADERS"),
  gstinNumber: text("gstin_number").default("23AAAAA0000A1Z5"),
  panNumber: text("pan_number").default("AAAAA0000A"),
  stateCode: text("state_code").default("23"),
  stateName: text("state_name").default("Madhya Pradesh"),
  allowedPincodesJson: text("allowed_pincodes_json").default("[\"484661\",\"484660\"]"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ShopSettings = typeof shopSettingsTable.$inferSelect;
export type InsertShopSettings = typeof shopSettingsTable.$inferInsert;
