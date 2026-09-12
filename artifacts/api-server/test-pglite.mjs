import { PGlite } from '@electric-sql/pglite';

async function test() {
  const pglite = new PGlite('memory://');
  await pglite.waitReady;

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

ALTER TABLE products ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER NOT NULL DEFAULT 30;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

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
`;

  try {
    await pglite.exec(createTablesSql);
    console.log('PGlite exec success!');
    const res = await pglite.query('SELECT count(*) FROM shop_settings;');
    console.log('shop_settings count:', res.rows);
  } catch (err) {
    console.error('PGlite exec failed:', err);
  }
}

test();
