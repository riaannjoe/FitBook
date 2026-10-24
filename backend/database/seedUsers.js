// DEV ONLY: gives every sample user (from seed_data.sql) a real bcrypt password so you can log in.
// Usage:  npm run seed:users      (default password: Fitbook@123, or SEED_PASSWORD from .env)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

(async () => {
  const hash = await bcrypt.hash(process.env.SEED_PASSWORD || 'Fitbook@123', 10);
  const r = await query('UPDATE users SET password_hash=?', [hash]);
  console.log(`Updated ${r.affectedRows} users. Logins: admin, trainer_rahul, member_aarav ... (see seed_data.sql)`);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
