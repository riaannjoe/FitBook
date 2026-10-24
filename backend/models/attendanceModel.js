const { query } = require('../config/db');
exports.openFor = async id => (await query('SELECT * FROM attendance WHERE member_id=? AND check_out IS NULL', [id]))[0];
exports.checkIn = async id => (await query('INSERT INTO attendance(member_id) VALUES(?)', [id])).insertId;
exports.checkOut = async id =>
  (await query('UPDATE attendance SET check_out=NOW() WHERE member_id=? AND check_out IS NULL', [id])).affectedRows;

exports.list = async ({ date, member_id }, { limit, offset }) => {
  const c = [], p = [];
  if (date) { c.push('DATE(a.check_in)=?'); p.push(date); }
  if (member_id) { c.push('a.member_id=?'); p.push(member_id); }
  const w = c.length ? 'WHERE ' + c.join(' AND ') : '';
  const rows = await query(
    `SELECT a.*, m.full_name FROM attendance a JOIN members m USING(member_id) ${w}
     ORDER BY a.check_in DESC LIMIT ? OFFSET ?`, [...p, limit, offset]);
  const [{ total }] = await query(`SELECT COUNT(*) total FROM attendance a ${w}`, p);
  return { rows, total };
};
exports.analytics = async () => ({
  byHour: await query('SELECT HOUR(check_in) hr, COUNT(*) visits FROM attendance GROUP BY hr ORDER BY hr'),
  byWeekday: await query('SELECT DAYNAME(check_in) day, COUNT(*) visits FROM attendance GROUP BY day, DAYOFWEEK(check_in) ORDER BY DAYOFWEEK(check_in)'),
  inactive: await query(`SELECT member_id, full_name, phone FROM members WHERE status='active' AND member_id NOT IN
    (SELECT member_id FROM attendance WHERE check_in>=DATE_SUB(NOW(), INTERVAL 30 DAY))`)
});
