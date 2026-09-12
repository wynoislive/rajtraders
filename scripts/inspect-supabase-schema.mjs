import { pool } from "@workspace/db";

async function inspectSchema() {
  const res = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'products';
  `);
  console.log("Supabase 'products' table columns:", res.rows);

  const alterRes = await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER NOT NULL DEFAULT 30;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    UPDATE products SET approval_status = 'approved' WHERE approval_status IS NULL;
    UPDATE products SET status = 'active' WHERE status IS NULL;
  `);
  console.log("Migration executed on Supabase!");

  const updatedCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'products';
  `);
  console.log("Updated columns:", updatedCols.rows);
  process.exit(0);
}

inspectSchema().catch((err) => {
  console.error("Inspect schema error:", err);
  process.exit(1);
});
