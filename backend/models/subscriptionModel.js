const { query } = require('../config/db');
exports.byMember = id => query(
  `SELECT s.*, p.plan_name, p.price FROM subscriptions s JOIN membership_plans p USING(plan_id)
   WHERE s.member_id=? ORDER BY s.start_date DESC`, [id]);
exports.currentOf = async id => (await query(
  `SELECT s.*, p.plan_name, p.price FROM subscriptions s JOIN membership_plans p USING(plan_id)
   WHERE s.member_id=? AND s.status='active' AND s.end_date>=CURRENT_DATE ORDER BY s.end_date DESC LIMIT 1`, [id]))[0];
exports.subscribe = (memberId, planId, method) => query('CALL sp_subscribe(?,?,?)', [memberId, planId, method]);
exports.expiring = days => query(
  `SELECT m.member_id, m.full_name, m.phone, s.end_date FROM subscriptions s JOIN members m USING(member_id)
   WHERE s.status='active' AND s.end_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)
   ORDER BY s.end_date`, [days]);
exports.expireCheck = async () => {
  const a = await query("UPDATE subscriptions SET status='expired' WHERE status='active' AND end_date<CURRENT_DATE");
  const b = await query(`UPDATE members SET status='expired' WHERE status='active' AND member_id NOT IN
    (SELECT member_id FROM subscriptions WHERE status='active')`);
  return { subscriptions_expired: a.affectedRows, members_expired: b.affectedRows };
};
