require('dotenv').config();
const express = require('express'), cors = require('cors'), bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'), mysql = require('mysql2/promise');

const db = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME, connectionLimit: 10 });
const app = express(); app.use(cors(), express.json());

// ---------- helpers ----------
const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(400).json({ error: e.sqlMessage || e.message }));
const auth = (...roles) => (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').split(' ')[1];
    req.user = jwt.verify(t, process.env.JWT_SECRET);
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
};
const q = async (sql, p = []) => (await db.query(sql, p))[0];

// ---------- AUTH ----------
app.post('/api/auth/register', wrap(async (req, res) => {
  const { username, password, role = 'admin' } = req.body;
  const r = await q('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)',
    [username, await bcrypt.hash(password, 10), role]);
  res.json({ user_id: r.insertId });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const [u] = await q('SELECT * FROM users WHERE username=?', [req.body.username]);
  if (!u || !(await bcrypt.compare(req.body.password, u.password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: jwt.sign({ id: u.user_id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '8h' }), role: u.role });
}));

// ---------- DASHBOARD ----------
app.get('/api/dashboard', auth('admin'), wrap(async (_, res) => res.json((await q('SELECT * FROM v_dashboard'))[0])));

// ---------- MEMBERS (CRUD) ----------
app.get('/api/members', auth('admin', 'trainer'), wrap(async (req, res) =>
  res.json(await q('SELECT * FROM members WHERE full_name LIKE ? ORDER BY member_id DESC', [`%${req.query.search || ''}%`]))));
app.get('/api/members/:id', auth('admin', 'trainer'), wrap(async (req, res) =>
  res.json((await q('SELECT * FROM members WHERE member_id=?', [req.params.id]))[0])));
app.post('/api/members', auth('admin'), wrap(async (req, res) => {
  const b = req.body;
  const r = await q(`INSERT INTO members(full_name,gender,dob,phone,email,address,emergency_contact)
    VALUES(?,?,?,?,?,?,?)`, [b.full_name, b.gender, b.dob, b.phone, b.email, b.address, b.emergency_contact]);
  res.json({ member_id: r.insertId });
}));
app.put('/api/members/:id', auth('admin'), wrap(async (req, res) => {
  const b = req.body;
  await q(`UPDATE members SET full_name=?,phone=?,email=?,address=?,emergency_contact=?,status=? WHERE member_id=?`,
    [b.full_name, b.phone, b.email, b.address, b.emergency_contact, b.status, req.params.id]);
  res.json({ ok: true });
}));
app.delete('/api/members/:id', auth('admin'), wrap(async (req, res) => {
  await q('DELETE FROM members WHERE member_id=?', [req.params.id]); res.json({ ok: true });
}));

// ---------- PLANS & SUBSCRIPTIONS ----------
app.get('/api/plans', auth(), wrap(async (_, res) => res.json(await q('SELECT * FROM membership_plans'))));
app.post('/api/plans', auth('admin'), wrap(async (req, res) => {
  const { plan_name, duration_months, price, description } = req.body;
  const r = await q('INSERT INTO membership_plans(plan_name,duration_months,price,description) VALUES(?,?,?,?)',
    [plan_name, duration_months, price, description]); res.json({ plan_id: r.insertId });
}));
// subscribe / renew -> stored procedure (transaction: subscription + payment)
app.post('/api/subscriptions', auth('admin'), wrap(async (req, res) => {
  const { member_id, plan_id, method } = req.body;
  await db.query('CALL sp_subscribe(?,?,?)', [member_id, plan_id, method]); res.json({ ok: true });
}));
app.get('/api/subscriptions/expiring', auth('admin'), wrap(async (req, res) =>
  res.json(await q(`SELECT m.full_name,m.phone,s.end_date FROM subscriptions s JOIN members m USING(member_id)
    WHERE s.status='active' AND s.end_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)`, [+req.query.days || 7]))));
// mark expired (run daily or call manually)
app.post('/api/subscriptions/expire-check', auth('admin'), wrap(async (_, res) => {
  await q("UPDATE subscriptions SET status='expired' WHERE status='active' AND end_date<CURRENT_DATE");
  await q(`UPDATE members SET status='expired' WHERE status='active' AND member_id NOT IN
    (SELECT member_id FROM subscriptions WHERE status='active')`);
  res.json({ ok: true });
}));

// ---------- TRAINERS ----------
app.get('/api/trainers', auth(), wrap(async (_, res) => res.json(await q(
  `SELECT t.*, COUNT(ta.member_id) AS clients FROM trainers t
   LEFT JOIN trainer_assignments ta ON ta.trainer_id=t.trainer_id AND ta.status='active' GROUP BY t.trainer_id`))));
app.post('/api/trainers', auth('admin'), wrap(async (req, res) => {
  const b = req.body;
  const r = await q('INSERT INTO trainers(full_name,phone,email,specialization,hire_date,salary) VALUES(?,?,?,?,?,?)',
    [b.full_name, b.phone, b.email, b.specialization, b.hire_date, b.salary]); res.json({ trainer_id: r.insertId });
}));
app.get('/api/trainers/:id/schedule', auth(), wrap(async (req, res) =>
  res.json(await q('SELECT * FROM trainer_schedules WHERE trainer_id=?', [req.params.id]))));
app.post('/api/trainers/:id/schedule', auth('admin'), wrap(async (req, res) => {
  const { day_of_week, start_time, end_time } = req.body;
  await q('INSERT INTO trainer_schedules(trainer_id,day_of_week,start_time,end_time) VALUES(?,?,?,?)',
    [req.params.id, day_of_week, start_time, end_time]); res.json({ ok: true });
}));
app.post('/api/assignments', auth('admin'), wrap(async (req, res) => {
  await q('INSERT INTO trainer_assignments(trainer_id,member_id) VALUES(?,?)', [req.body.trainer_id, req.body.member_id]);
  res.json({ ok: true });
}));
app.get('/api/trainers/:id/clients', auth('admin', 'trainer'), wrap(async (req, res) =>
  res.json(await q(`SELECT m.* FROM trainer_assignments ta JOIN members m USING(member_id)
    WHERE ta.trainer_id=? AND ta.status='active'`, [req.params.id]))));

// ---------- ATTENDANCE ----------
app.post('/api/attendance/checkin', auth('admin'), wrap(async (req, res) => {
  const [ok] = await q(`SELECT 1 FROM subscriptions WHERE member_id=? AND status='active' AND end_date>=CURRENT_DATE`, [req.body.member_id]);
  if (!ok) return res.status(400).json({ error: 'No active membership' });
  await q('INSERT INTO attendance(member_id) VALUES(?)', [req.body.member_id]); res.json({ ok: true });
}));
app.post('/api/attendance/checkout', auth('admin'), wrap(async (req, res) => {
  await q('UPDATE attendance SET check_out=NOW() WHERE member_id=? AND check_out IS NULL', [req.body.member_id]); res.json({ ok: true });
}));
app.get('/api/attendance/analytics', auth('admin'), wrap(async (_, res) => res.json({
  byHour: await q('SELECT HOUR(check_in) hr, COUNT(*) visits FROM attendance GROUP BY hr ORDER BY hr'),
  byWeekday: await q('SELECT DAYNAME(check_in) day, COUNT(*) visits FROM attendance GROUP BY day, DAYOFWEEK(check_in) ORDER BY DAYOFWEEK(check_in)'),
  inactive: await q(`SELECT full_name,phone FROM members WHERE status='active' AND member_id NOT IN
    (SELECT member_id FROM attendance WHERE check_in>=DATE_SUB(NOW(),INTERVAL 30 DAY))`) })));

// ---------- WORKOUT PLANS ----------
app.get('/api/exercises', auth(), wrap(async (_, res) => res.json(await q('SELECT * FROM exercises'))));
app.post('/api/exercises', auth('admin', 'trainer'), wrap(async (req, res) => {
  const { name, muscle_group, description } = req.body;
  await q('INSERT INTO exercises(name,muscle_group,description) VALUES(?,?,?)', [name, muscle_group, description]); res.json({ ok: true });
}));
app.post('/api/workout-plans', auth('trainer', 'admin'), wrap(async (req, res) => {
  const { trainer_id, title, goal, level, exercises = [] } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query('INSERT INTO workout_plans(trainer_id,title,goal,level) VALUES(?,?,?,?)', [trainer_id, title, goal, level]);
    for (const e of exercises)
      await conn.query('INSERT INTO workout_plan_exercises(workout_plan_id,exercise_id,day_number,sets,reps) VALUES(?,?,?,?,?)',
        [r.insertId, e.exercise_id, e.day_number, e.sets, e.reps]);
    await conn.commit(); res.json({ workout_plan_id: r.insertId });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));
app.post('/api/workout-plans/assign', auth('trainer', 'admin'), wrap(async (req, res) => {
  await q('INSERT INTO member_workout_plans(member_id,workout_plan_id,end_date) VALUES(?,?,?)',
    [req.body.member_id, req.body.workout_plan_id, req.body.end_date || null]); res.json({ ok: true });
}));
app.get('/api/members/:id/workout', auth(), wrap(async (req, res) => res.json(await q(
  `SELECT wp.title, wpe.day_number, e.name, e.muscle_group, wpe.sets, wpe.reps
   FROM member_workout_plans mwp JOIN workout_plans wp USING(workout_plan_id)
   JOIN workout_plan_exercises wpe USING(workout_plan_id) JOIN exercises e USING(exercise_id)
   WHERE mwp.member_id=? ORDER BY wpe.day_number`, [req.params.id]))));

// ---------- PAYMENTS & REPORTS ----------
app.get('/api/payments', auth('admin'), wrap(async (_, res) => res.json(await q(
  `SELECT p.*, m.full_name FROM payments p JOIN members m USING(member_id) ORDER BY payment_date DESC`))));
app.get('/api/reports/revenue', auth('admin'), wrap(async (_, res) => res.json({
  monthly: await q(`SELECT DATE_FORMAT(payment_date,'%Y-%m') month, COUNT(*) txns, SUM(amount) revenue
    FROM payments WHERE status='paid' GROUP BY month ORDER BY month DESC`),
  byPlan: await q(`SELECT p.plan_name, COUNT(*) sold, SUM(pay.amount) revenue FROM payments pay
    JOIN subscriptions s USING(subscription_id) JOIN membership_plans p USING(plan_id) GROUP BY p.plan_name`) })));

// ---------- EQUIPMENT & MAINTENANCE ----------
app.get('/api/equipment', auth(), wrap(async (_, res) => res.json(await q('SELECT * FROM equipment'))));
app.post('/api/equipment', auth('admin'), wrap(async (req, res) => {
  const b = req.body;
  await q('INSERT INTO equipment(name,category,purchase_date,cost) VALUES(?,?,?,?)', [b.name, b.category, b.purchase_date, b.cost]);
  res.json({ ok: true });
}));
app.post('/api/maintenance', auth(), wrap(async (req, res) => {
  await q('INSERT INTO maintenance_requests(equipment_id,reported_by,issue) VALUES(?,?,?)',
    [req.body.equipment_id, req.user.id, req.body.issue]); res.json({ ok: true });
}));
app.put('/api/maintenance/:id', auth('admin'), wrap(async (req, res) => {
  const { status, repair_cost = 0 } = req.body;
  await q(`UPDATE maintenance_requests SET status=?, repair_cost=?, resolved_date=IF(?='resolved',CURRENT_DATE,NULL) WHERE request_id=?`,
    [status, repair_cost, status, req.params.id]); res.json({ ok: true });
}));
app.get('/api/maintenance', auth('admin'), wrap(async (_, res) => res.json(await q(
  `SELECT r.*, e.name equipment FROM maintenance_requests r JOIN equipment e USING(equipment_id) ORDER BY reported_date DESC`))));

app.listen(process.env.PORT || 5000, () => console.log('FitBook API running'));
