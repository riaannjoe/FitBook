
/*
 * DEV ONLY: Assigns a bcrypt password to sample users.
 * Usage: npm run seed:users
 * Requires SEED_PASSWORD in backend/.env
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

(async () => {
  const seedPassword = process.env.SEED_PASSWORD;

  if (!seedPassword || seedPassword.length < 12) {
    throw new Error(
      'SEED_PASSWORD must be set and contain at least 12 characters.'
    );
  }

  const hash = await bcrypt.hash(seedPassword, 10);

  const r = await query('UPDATE users SET password_hash=?', [hash]);

  console.log(
    `Updated ${r.affectedRows} users. Logins: admin, trainer_rahul, member_aarav ... (see seed_data.sql)`
  );

  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
