const Workout = require('../models/workoutModel');
const ApiError = require('../utils/ApiError');

// flat join rows -> [{ ...plan, exercises: [...] }] so the frontend gets ready-to-render JSON
const group = (rows, key) => {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r[key])) {
      map.set(r[key], {
        ...(r.mwp_id && { mwp_id: r.mwp_id, assigned_date: r.assigned_date, end_date: r.end_date }),
        workout_plan_id: r.workout_plan_id, title: r.title, goal: r.goal, level: r.level, exercises: []
      });
    }
    if (r.exercise_id) map.get(r[key]).exercises.push({
      exercise_id: r.exercise_id, name: r.exercise_name, muscle_group: r.muscle_group,
      day_number: r.day_number, sets: r.sets, reps: r.reps
    });
  }
  return [...map.values()];
};

exports.memberWorkouts = async id => group(await Workout.memberPlans(id), 'mwp_id');
exports.planDetail = async id => group(await Workout.planDetail(id), 'workout_plan_id')[0];

exports.createPlan = async (user, body) => {
  const trainer_id = user.role === 'trainer' ? user.trainer_id : body.trainer_id;
  if (!trainer_id) throw new ApiError(400, 'VALIDATION_ERROR', 'trainer_id is required');
  const exercises = body.exercises || [];
  const bad = exercises.findIndex(e => !e.exercise_id || !e.day_number || !e.sets || !e.reps);
  if (bad !== -1) throw new ApiError(400, 'VALIDATION_ERROR', `exercises[${bad}] needs exercise_id, day_number, sets, reps`);
  return { workout_plan_id: await Workout.createPlanWithExercises({ ...body, trainer_id, exercises }) };
};
