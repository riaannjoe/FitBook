const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { found } = require('../utils/ensure');
const Workout = require('../models/workoutModel');
const Member = require('../models/memberModel');
const workoutService = require('../services/workoutService');

exports.exercises = asyncHandler(async (req, res) => ok(res, await Workout.exercises()));
exports.createExercise = asyncHandler(async (req, res) => created(res, { exercise_id: await Workout.createExercise(req.body) }));
exports.plans = asyncHandler(async (req, res) => ok(res, await Workout.plans(req.query)));
exports.planDetail = asyncHandler(async (req, res) => ok(res, found(await workoutService.planDetail(req.params.id), 'Workout plan')));
exports.createPlan = asyncHandler(async (req, res) => created(res, await workoutService.createPlan(req.user, req.body)));
exports.assign = asyncHandler(async (req, res) => {
  found(await Member.findById(req.body.member_id), 'Member');
  found(await workoutService.planDetail(req.body.workout_plan_id), 'Workout plan');
  created(res, { mwp_id: await Workout.assign(req.body.member_id, req.body.workout_plan_id, req.body.end_date) });
});
