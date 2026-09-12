import pg from 'pg';

const hosts = [
  'aws-0-ap-south-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-0-eu-central-1.pooler.supabase.com'
];
const ports = [6543, 5432];

async function testAll() {
  for (const host of hosts) {
    for (const port of ports) {
      const connStr = `postgresql://postgres.hbwwbapappmsbdsjaasm:jooPR0L9GDu6R7sM@${host}:${port}/postgres`;
      const pool = new pg.Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
      try {
        const res = await pool.query('SELECT NOW()');
        console.log(`SUCCESS on ${host}:${port} -> `, res.rows[0]);
      } catch (err) {
        console.log(`FAILED on ${host}:${port}: ${err.message}`);
      } finally {
        await pool.end().catch(() => {});
      }
    }
  }
}
testAll();
