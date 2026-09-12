import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:jooPR0L9GDu6R7sM@db.hbwwbapappmsbdsjaasm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const query = 'SELECT id, first_name, last_name, mobile_number, email, password_hash, created_at, updated_at FROM users WHERE email = $1 LIMIT $2';
    const res = await pool.query(query, ['rajtrader.test99@example.com', 1]);
    console.log('Result:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
test();
