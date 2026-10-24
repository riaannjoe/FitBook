const { query } = require('../config/db');
exports.list = () => query('SELECT * FROM membership_plans ORDER BY duration_months, price');
exports.findById = async id => (await query('SELECT * FROM membership_plans WHERE plan_id=?', [id]))[0];
exports.create = async b => (await query(
  'INSERT INTO membership_plans(plan_name,duration_months,price,description) VALUES(?,?,?,?)',
  [b.plan_name, b.duration_months, b.price, b.description || null])).insertId;
exports.remove = async id => (await query('DELETE FROM membership_plans WHERE plan_id=?', [id])).affectedRows;
exports.UPDATABLE = ['plan_name', 'duration_months', 'price', 'description'];
