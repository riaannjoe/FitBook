const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const paginate = require('../utils/pagination');
const { found } = require('../utils/ensure');
const ApiError = require('../utils/ApiError');
const Member = require('../models/memberModel');
const Sub = require('../models/subscriptionModel');
const Payment = require('../models/paymentModel');
const Attendance = require('../models/attendanceModel');
const Trainer = require('../models/trainerModel');
const workoutService = require('../services/workoutService');

// "me" endpoints use the member_id / trainer_id stored in the JWT, so nobody can read someone else's data
const memberId = req => {
  if (!req.user.member_id) throw new ApiError(403, 'NO_MEMBER_PROFILE', 'This login is not linked to a member profile');
  return req.user.member_id;
};

exports.profile = asyncHandler(async (req, res) => {
  const id = memberId(req);
  ok(res, { ...found(await Member.findById(id), 'Member'), current_subscription: (await Sub.currentOf(id)) || null });
});
exports.subscriptions = asyncHandler(async (req, res) => ok(res, await Sub.byMember(memberId(req))));
exports.workout = asyncHandler(async (req, res) => ok(res, await workoutService.memberWorkouts(memberId(req))));
exports.payments = asyncHandler(async (req, res) => ok(res, await Payment.byMember(memberId(req))));
exports.attendance = asyncHandler(async (req, res) => {
  const pg = paginate.parse(req);
  const { rows, total } = await Attendance.list({ member_id: memberId(req) }, pg);
  ok(res, rows, paginate.meta(pg.page, pg.limit, total));
});
exports.clients = asyncHandler(async (req, res) => {
  if (!req.user.trainer_id) throw new ApiError(403, 'NO_TRAINER_PROFILE', 'This login is not linked to a trainer profile');
  ok(res, await Trainer.clients(req.user.trainer_id));
});
