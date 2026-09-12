import pg from "pg";

const rawDbUrl = "postgresql://postgres.hbwwbapappmsbdsjaasm:jooPR0L9GDu6R7sM@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const pool = new pg.Pool({ connectionString: rawDbUrl, ssl: { rejectUnauthorized: false } });

async function cleanup() {
  const email = "babykidollhe@gmail.com";
  console.log("Cleaning up unverified user:", email);

  const res1 = await pool.query("DELETE FROM email_verifications WHERE email = $1", [email]);
  console.log("Deleted email_verifications:", res1.rowCount);

  const res2 = await pool.query("DELETE FROM users WHERE email = $1", [email]);
  console.log("Deleted users:", res2.rowCount);

  console.log("Cleanup complete!");
  await pool.end();
}

cleanup();
