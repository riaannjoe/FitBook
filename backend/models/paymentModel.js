const { query } = require('../config/db');
exports.list = async ({ member_id, status }, { limit, offset }) => {
  const c = [], p = [];
  if (member_id) { c.push('p.member_id=?'); p.push(member_id); }
  if (status) { c.push('p.status=?'); p.push(status); }
  const w = c.length ? 'WHERE ' + c.join(' AND ') : '';
  const rows = await query(
    `SELECT p.*, m.full_name FROM payments p JOIN members m USING(member_id) ${w}
     ORDER BY p.payment_date DESC, p.payment_id DESC LIMIT ? OFFSET ?`, [...p, limit, offset]);
  const [{ total }] = await query(`SELECT COUNT(*) total FROM payments p ${w}`, p);
  return { rows, total };
};
exports.byMember = id => query(
  `SELECT p.*, pl.plan_name FROM payments p JOIN subscriptions s USING(subscription_id)
   JOIN membership_plans pl USING(plan_id) WHERE p.member_id=? ORDER BY p.payment_date DESC`, [id]);
exports.revenue = async () => ({
  monthly: await query(`SELECT DATE_FORMAT(payment_date,'%Y-%m') month, COUNT(*) txns, SUM(amount) revenue
    FROM payments WHERE status='paid' GROUP BY month ORDER BY month DESC`),
  byPlan: await query(`SELECT pl.plan_name, COUNT(*) sold, SUM(pay.amount) revenue FROM payments pay
    JOIN subscriptions s USING(subscription_id) JOIN membership_plans pl USING(plan_id)
    WHERE pay.status='paid' GROUP BY pl.plan_name ORDER BY revenue DESC`)
});
