const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { found } = require('../utils/ensure');
const { updateRow } = require('../utils/sql');
const ApiError = require('../utils/ApiError');
const Trainer = require('../models/trainerModel');
const Member = require('../models/memberModel');

// salary is private: only admin sees it
const hideSalary = (user, t) => { if (user.role !== 'admin') delete t.salary; return t; };
// a trainer may only look at their own clients/schedule changes
const ownOrAdmin = (req) => {
  if (req.user.role === 'trainer' && String(req.user.trainer_id) !== String(req.params.id))
    throw new ApiError(403, 'FORBIDDEN', 'Trainers can only access their own data');
};

exports.list = asyncHandler(async (req, res) => ok(res, (await Trainer.list()).map(t => hideSalary(req.user, t))));
exports.get = asyncHandler(async (req, res) => ok(res, hideSalary(req.user, found(await Trainer.findById(req.params.id), 'Trainer'))));
exports.create = asyncHandler(async (req, res) => created(res, { trainer_id: await Trainer.create(req.body) }));
exports.update = asyncHandler(async (req, res) => {
  found(await updateRow('trainers', 'trainer_id', req.params.id, req.body, Trainer.UPDATABLE), 'Trainer');
  ok(res, await Trainer.findById(req.params.id));
});
exports.remove = asyncHandler(async (req, res) => {
  found(await Trainer.remove(req.params.id), 'Trainer');
  ok(res, { deleted: true });
});

exports.schedule = asyncHandler(async (req, res) => ok(res, await Trainer.schedule(req.params.id)));
exports.addSlot = asyncHandler(async (req, res) => created(res, { schedule_id: await Trainer.addSlot(req.params.id, req.body) }));
exports.removeSlot = asyncHandler(async (req, res) => {
  found(await Trainer.removeSlot(req.params.id, req.params.slotId), 'Schedule slot');
  ok(res, { deleted: true });
});
exports.clients = asyncHandler(async (req, res) => { ownOrAdmin(req); ok(res, await Trainer.clients(req.params.id)); });

exports.assign = asyncHandler(async (req, res) => {
  found(await Trainer.findById(req.body.trainer_id), 'Trainer');
  found(await Member.findById(req.body.member_id), 'Member');
  created(res, { assignment_id: await Trainer.assign(req.body.trainer_id, req.body.member_id) });
});
exports.endAssignment = asyncHandler(async (req, res) => {
  found(await Trainer.endAssignment(req.params.id), 'Assignment');
  ok(res, { ended: true });
});
