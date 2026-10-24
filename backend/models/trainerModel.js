const { query } = require('../config/db');
exports.list = () => query(
  `SELECT t.*, COUNT(ta.member_id) AS clients FROM trainers t
   LEFT JOIN trainer_assignments ta ON ta.trainer_id=t.trainer_id AND ta.status='active'
   GROUP BY t.trainer_id ORDER BY t.full_name`);
exports.findById = async id => (await query('SELECT * FROM trainers WHERE trainer_id=?', [id]))[0];
exports.create = async b => (await query(
  'INSERT INTO trainers(user_id,full_name,phone,email,specialization,hire_date,salary) VALUES(?,?,?,?,?,?,?)',
  [b.user_id || null, b.full_name, b.phone, b.email || null, b.specialization || null, b.hire_date, b.salary ?? null])).insertId;
exports.remove = async id => (await query('DELETE FROM trainers WHERE trainer_id=?', [id])).affectedRows;
exports.UPDATABLE = ['full_name', 'phone', 'email', 'specialization', 'hire_date', 'salary'];

exports.schedule = id => query(
  `SELECT * FROM trainer_schedules WHERE trainer_id=? ORDER BY FIELD(day_of_week,'Mon','Tue','Wed','Thu','Fri','Sat','Sun'), start_time`, [id]);
exports.addSlot = async (id, b) => (await query(
  'INSERT INTO trainer_schedules(trainer_id,day_of_week,start_time,end_time) VALUES(?,?,?,?)',
  [id, b.day_of_week, b.start_time, b.end_time])).insertId;
exports.removeSlot = async (trainerId, slotId) =>
  (await query('DELETE FROM trainer_schedules WHERE schedule_id=? AND trainer_id=?', [slotId, trainerId])).affectedRows;

exports.clients = id => query(
  `SELECT m.*, ta.assignment_id, ta.assigned_date FROM trainer_assignments ta JOIN members m USING(member_id)
   WHERE ta.trainer_id=? AND ta.status='active' ORDER BY m.full_name`, [id]);
exports.assign = async (trainerId, memberId) => (await query(
  'INSERT INTO trainer_assignments(trainer_id,member_id) VALUES(?,?)', [trainerId, memberId])).insertId;
exports.endAssignment = async id =>
  (await query("UPDATE trainer_assignments SET status='ended' WHERE assignment_id=?", [id])).affectedRows;
