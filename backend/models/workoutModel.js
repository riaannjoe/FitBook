const { query, pool } = require('../config/db');

exports.exercises = () => query('SELECT * FROM exercises ORDER BY muscle_group, name');
exports.createExercise = async b => (await query(
  'INSERT INTO exercises(name,muscle_group,description) VALUES(?,?,?)', [b.name, b.muscle_group, b.description || null])).insertId;

exports.plans = ({ goal, level }) => {
  const c = [], p = [];
  if (goal) { c.push('wp.goal=?'); p.push(goal); }
  if (level) { c.push('wp.level=?'); p.push(level); }
  return query(`SELECT wp.*, t.full_name AS trainer_name FROM workout_plans wp JOIN trainers t USING(trainer_id)
    ${c.length ? 'WHERE ' + c.join(' AND ') : ''} ORDER BY wp.workout_plan_id DESC`, p);
};

const planRows = `
  SELECT wp.workout_plan_id, wp.title, wp.goal, wp.level, wpe.day_number,
         e.exercise_id, e.name AS exercise_name, e.muscle_group, wpe.sets, wpe.reps`;
exports.planDetail = id => query(
  `${planRows} FROM workout_plans wp
   LEFT JOIN workout_plan_exercises wpe USING(workout_plan_id) LEFT JOIN exercises e USING(exercise_id)
   WHERE wp.workout_plan_id=? ORDER BY wpe.day_number`, [id]);

exports.memberPlans = id => query(
  `SELECT mwp.mwp_id, mwp.assigned_date, mwp.end_date,
          wp.workout_plan_id, wp.title, wp.goal, wp.level, wpe.day_number,
          e.exercise_id, e.name AS exercise_name, e.muscle_group, wpe.sets, wpe.reps
   FROM member_workout_plans mwp JOIN workout_plans wp USING(workout_plan_id)
   LEFT JOIN workout_plan_exercises wpe USING(workout_plan_id) LEFT JOIN exercises e USING(exercise_id)
   WHERE mwp.member_id=? ORDER BY mwp.assigned_date DESC, mwp.mwp_id DESC, wpe.day_number`, [id]);

exports.assign = async (memberId, planId, endDate) => (await query(
  'INSERT INTO member_workout_plans(member_id,workout_plan_id,end_date) VALUES(?,?,?)', [memberId, planId, endDate || null])).insertId;

// plan + its exercises must be saved together or not at all -> transaction
exports.createPlanWithExercises = async ({ trainer_id, title, goal, level, exercises }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query('INSERT INTO workout_plans(trainer_id,title,goal,level) VALUES(?,?,?,?)', [trainer_id, title, goal, level]);
    for (const e of exercises)
      await conn.query('INSERT INTO workout_plan_exercises(workout_plan_id,exercise_id,day_number,sets,reps) VALUES(?,?,?,?,?)',
        [r.insertId, e.exercise_id, e.day_number, e.sets, e.reps]);
    await conn.commit();
    return r.insertId;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};
