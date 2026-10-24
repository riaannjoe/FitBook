const mysql = require('mysql2/promise');

// dateStrings: DATE columns come out as 'YYYY-MM-DD' strings (no timezone surprises for the frontend)
const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  connectionLimit: 10, dateStrings: true
});

// returns rows for SELECT, or the result header (insertId, affectedRows) for writes
const query = async (sql, params = []) => (await pool.query(sql, params))[0];

module.exports = { pool, query };
