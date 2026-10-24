const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const paginate = require('../utils/pagination');
const { found } = require('../utils/ensure');
const { updateRow } = require('../utils/sql');
const Member = require('../models/memberModel');
const Sub = require('../models/subscriptionModel');
const workoutService = require('../services/workoutService');

exports.list = asyncHandler(async (req, res) => {
  const pg = paginate.parse(req);
  const { rows, total } = await Member.list({ search: req.query.search, status: req.query.status }, pg);
  ok(res, rows, paginate.meta(pg.page, pg.limit, total));
});
exports.get = asyncHandler(async (req, res) => ok(res, found(await Member.findById(req.params.id), 'Member')));
exports.create = asyncHandler(async (req, res) => created(res, { member_id: await Member.create(req.body) }));
exports.update = asyncHandler(async (req, res) => {
  found(await updateRow('members', 'member_id', req.params.id, req.body, Member.UPDATABLE), 'Member');
  ok(res, await Member.findById(req.params.id));
});
exports.remove = asyncHandler(async (req, res) => {
  found(await Member.remove(req.params.id), 'Member');
  ok(res, { deleted: true });
});
exports.subscriptions = asyncHandler(async (req, res) => ok(res, await Sub.byMember(req.params.id)));
exports.workout = asyncHandler(async (req, res) => ok(res, await workoutService.memberWorkouts(req.params.id)));
