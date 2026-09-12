import pg from "pg";

const rawDbUrl = "postgresql://postgres.hbwwbapappmsbdsjaasm:jooPR0L9GDu6R7sM@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const pool = new pg.Pool({ connectionString: rawDbUrl, ssl: { rejectUnauthorized: false } });

async function inspectUser() {
  const email = "babykidollhe@gmail.com";
  
  const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  console.log("USER RECORD IN DB:", userRes.rows);

  const otpRes = await pool.query("SELECT * FROM email_verifications WHERE email = $1 ORDER BY created_at DESC", [email]);
  console.log("OTP VERIFICATIONS IN DB:", otpRes.rows);

  await pool.end();
}

inspectUser();
