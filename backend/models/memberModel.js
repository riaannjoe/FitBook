const { query } = require('../config/db');

const where = f => {
  const c = [], p = [];
  if (f.search) { c.push('(full_name LIKE ? OR phone LIKE ?)'); p.push(`%${f.search}%`, `%${f.search}%`); }
  if (f.status) { c.push('status=?'); p.push(f.status); }
  return { sql: c.length ? 'WHERE ' + c.join(' AND ') : '', p };
};

exports.list = async (f, { limit, offset }) => {
  const w = where(f);
  const rows = await query(`SELECT * FROM members ${w.sql} ORDER BY member_id DESC LIMIT ? OFFSET ?`, [...w.p, limit, offset]);
  const [{ total }] = await query(`SELECT COUNT(*) total FROM members ${w.sql}`, w.p);
  return { rows, total };
};
exports.findById = async id => (await query('SELECT * FROM members WHERE member_id=?', [id]))[0];
exports.create = async b => (await query(
  `INSERT INTO members(user_id,full_name,gender,dob,phone,email,address,emergency_contact) VALUES(?,?,?,?,?,?,?,?)`,
  [b.user_id || null, b.full_name, b.gender, b.dob, b.phone, b.email || null, b.address || null, b.emergency_contact || null])).insertId;
exports.remove = async id => (await query('DELETE FROM members WHERE member_id=?', [id])).affectedRows;
exports.UPDATABLE = ['full_name', 'gender', 'dob', 'phone', 'email', 'address', 'emergency_contact', 'status'];
