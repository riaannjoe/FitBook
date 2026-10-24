const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { found } = require('../utils/ensure');
const { updateRow } = require('../utils/sql');
const Plan = require('../models/planModel');

exports.list = asyncHandler(async (req, res) => ok(res, await Plan.list()));
exports.create = asyncHandler(async (req, res) => created(res, { plan_id: await Plan.create(req.body) }));
exports.update = asyncHandler(async (req, res) => {
  found(await updateRow('membership_plans', 'plan_id', req.params.id, req.body, Plan.UPDATABLE), 'Plan');
  ok(res, await Plan.findById(req.params.id));
});
exports.remove = asyncHandler(async (req, res) => {
  found(await Plan.remove(req.params.id), 'Plan');
  ok(res, { deleted: true });
});
