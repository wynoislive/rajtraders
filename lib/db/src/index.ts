import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import path from "path";
import { eq } from "drizzle-orm";
import * as schema from "./schema/index.js";

const { Pool } = pg;

let dbInstance: any;
let poolInstance: any = null;

const createTablesSql = `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  featured BOOLEAN NOT NULL DEFAULT false,
  inventory INTEGER NOT NULL DEFAULT 0,
  prep_time_minutes INTEGER NOT NULL DEFAULT 30,
  approval_status TEXT NOT NULL DEFAULT 'approved',
  submitted_by TEXT,
  approved_by TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percentage',
  value REAL NOT NULL,
  minimum_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  first_order_only BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS registration_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  offer_code TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  window_days INTEGER NOT NULL DEFAULT 14,
  registrations_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registration_claims (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  policy_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  user_id TEXT,
  customer_email TEXT,
  customer_name TEXT,
  customer_mobile TEXT,
  shipping_address TEXT,
  delivery_latitude REAL,
  delivery_longitude REAL,
  delivery_distance_km REAL,
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  items_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deleted_accounts_log (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  penalty_expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_lockouts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  locked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS totp_secrets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  recovery_codes TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_settings (
  id TEXT PRIMARY KEY,
  shop_name TEXT NOT NULL DEFAULT 'My Shop',
  shop_domain TEXT NOT NULL DEFAULT 'myshop.com',
  shop_address TEXT NOT NULL DEFAULT '123 Baker Street, Mumbai',
  latitude REAL NOT NULL DEFAULT 19.0760,
  longitude REAL NOT NULL DEFAULT 72.8777,
  delivery_radius_km REAL NOT NULL DEFAULT 15.0,
  is_delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  razorpay_key_id TEXT NOT NULL DEFAULT 'rzp_test_sandbox123456',
  razorpay_key_secret TEXT NOT NULL DEFAULT 'sandbox_secret',
  r2_account_id TEXT DEFAULT '',
  r2_access_key_id TEXT DEFAULT '',
  r2_secret_access_key TEXT DEFAULT '',
  r2_bucket_name TEXT DEFAULT 'my-products',
  r2_public_url TEXT DEFAULT '',
  smtp_host TEXT DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER DEFAULT 465,
  smtp_user TEXT DEFAULT 'notifications.rajtraders@gmail.com',
  smtp_pass TEXT DEFAULT 'NOTIFICATIONS@RAJ',
  smtp_from TEXT DEFAULT 'My Shop <notifications.rajtraders@gmail.com>',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO shop_settings (id, shop_name, shop_domain, shop_address, latitude, longitude, delivery_radius_km, is_delivery_enabled, razorpay_key_id, razorpay_key_secret, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from)
VALUES ('default_shop', 'My Shop', 'myshop.com', '123 Baker Street, Mumbai', 19.0760, 72.8777, 15.0, true, 'rzp_test_sandbox123456', 'sandbox_secret', 'smtp.gmail.com', 465, 'notifications.rajtraders@gmail.com', 'NOTIFICATIONS@RAJ', 'My Shop <notifications.rajtraders@gmail.com>')
ON CONFLICT (id) DO NOTHING;

-- Seed Default MAIN_ADMIN user
INSERT INTO admin_users (id, name, email, password_hash, role, active)
VALUES (
  'main_admin_01',
  'Master Administrator',
  'admin@harborlane.shop',
  'd6c547847c23114a:61a9e3a6aef60cf3ff13d96df2bc2d5c4125b290ba234857b29a28c2e99d3fbc9583be5fcaaebe3ffc129e612cb7f8d672ea351b8d601bce2b8a69d7b4a2b16d',
  'MAIN_ADMIN',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Products
INSERT INTO products (id, name, slug, description, price_cents, compare_at_price_cents, category, image_url, status, featured, inventory, prep_time_minutes, approval_status)
VALUES 
  ('prod_1', 'Harbor Linen Overshirt', 'harbor-linen-overshirt', 'A breathable everyday layer with a relaxed cut and soft washed finish.', 8900, 12000, 'Apparel', 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=80', 'active', true, 24, 30, 'approved'),
  ('prod_2', 'Stoneware Pour-Over Set', 'stoneware-pour-over-set', 'Hand-finished stoneware for slow mornings and generous pours.', 5400, NULL, 'Home', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80', 'active', true, 12, 30, 'approved'),
  ('prod_3', 'Canvas Market Tote', 'canvas-market-tote', 'A durable carryall with an inside pocket for the little things.', 3200, NULL, 'Accessories', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80', 'draft', false, 40, 30, 'pending_approval')
ON CONFLICT (id) DO NOTHING;

-- Seed Default Discounts
INSERT INTO discounts (id, code, type, value, minimum_subtotal_cents, usage_limit, active, first_order_only)
VALUES 
  ('disc_1', 'WELCOME10', 'percentage', 10, 2500, 500, true, true),
  ('disc_2', 'HARBOR15', 'fixed', 1500, 9000, 100, true, false)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Registration Policy
INSERT INTO registration_policies (id, name, description, offer_code, active, window_days, registrations_count)
VALUES ('policy_1', 'Welcome offer', 'Give first-time shoppers a warm welcome without stacking offers.', 'WELCOME10', true, 14, 0)
ON CONFLICT (id) DO NOTHING;

-- ─── Performance Indexes ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_email_token ON password_resets(email, token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts_log(email);
CREATE INDEX IF NOT EXISTS idx_products_status_approval ON products(status, approval_status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_totp_secrets_user_id ON totp_secrets(user_id);
`;

/**
 * Syncs .env overrides into shop_settings on boot using parameterised
 * Drizzle ORM update() calls — NOT raw SQL interpolation (which was
 * vulnerable to SQL injection).
 */
async function syncEnvToShopSettings(db: any): Promise<void> {
  const updates: Partial<typeof schema.shopSettingsTable.$inferInsert> = {};

  if (process.env.RAZORPAY_KEY_ID) updates.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  if (process.env.RAZORPAY_KEY_SECRET) updates.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (process.env.SMTP_HOST) updates.smtpHost = process.env.SMTP_HOST;
  if (process.env.SMTP_PORT) updates.smtpPort = parseInt(process.env.SMTP_PORT, 10);
  if (process.env.SMTP_USER) updates.smtpUser = process.env.SMTP_USER;
  if (process.env.SMTP_PASS) updates.smtpPass = process.env.SMTP_PASS;
  if (process.env.SMTP_FROM) updates.smtpFrom = process.env.SMTP_FROM;
  if (process.env.R2_ACCOUNT_ID) updates.r2AccountId = process.env.R2_ACCOUNT_ID;
  if (process.env.R2_ACCESS_KEY_ID) updates.r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  if (process.env.R2_SECRET_ACCESS_KEY) updates.r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (process.env.R2_BUCKET_NAME) updates.r2BucketName = process.env.R2_BUCKET_NAME;
  if (process.env.R2_PUBLIC_URL) updates.r2PublicUrl = process.env.R2_PUBLIC_URL;
  if (process.env.SHOP_NAME) updates.shopName = process.env.SHOP_NAME;
  if (process.env.SHOP_ADDRESS) updates.shopAddress = process.env.SHOP_ADDRESS;
  if (process.env.SHOP_LATITUDE) updates.latitude = parseFloat(process.env.SHOP_LATITUDE);
  if (process.env.SHOP_LONGITUDE) updates.longitude = parseFloat(process.env.SHOP_LONGITUDE);
  if (process.env.DELIVERY_RADIUS_KM) updates.deliveryRadiusKm = parseFloat(process.env.DELIVERY_RADIUS_KM);
  if (process.env.DELIVERY_ENABLED) updates.isDeliveryEnabled = process.env.DELIVERY_ENABLED === "true";

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.shopSettingsTable)
      .set(updates)
      .where(eq(schema.shopSettingsTable.id, "default_shop"));
  }
}

let dbReadyPromise: Promise<any> | null = null;
let pgliteInstance: any = null;

if (process.env.DATABASE_URL) {
  poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
  dbInstance = drizzlePg(poolInstance, { schema });
} else {
  const dataDir = "memory://";
  pgliteInstance = new PGlite(dataDir);
  dbInstance = drizzlePglite(pgliteInstance, { schema });
}

export async function ensureDbReady(): Promise<any> {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      try {
        if (!process.env.DATABASE_URL && pgliteInstance) {
          await pgliteInstance.waitReady;
          await pgliteInstance.exec(createTablesSql);
          await syncEnvToShopSettings(dbInstance);
        }
      } catch (err: any) {
        console.error("ensureDbReady initialization error:", err);
        dbReadyPromise = null;
        throw err;
      }
      return dbInstance;
    })();
  }
  return dbReadyPromise;
}

// Trigger initialization on module load
ensureDbReady();

export const pool = poolInstance;
export const db = dbInstance;

export * from "./schema";
