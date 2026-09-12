import pg from "pg";

const { Pool } = pg;
const rawDbUrl = "postgresql://postgres.hbwwbapappmsbdsjaasm:jooPR0L9GDu6R7sM@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

const pool = new Pool({
  connectionString: rawDbUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkSettings() {
  try {
    const res = await pool.query("SELECT * FROM shop_settings WHERE id = 'default_shop'");
    console.log("SHOP SETTINGS IN LIVE DB:");
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error("Error fetching settings:", err);
  } finally {
    await pool.end();
  }
}

checkSettings();
