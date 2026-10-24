const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { found } = require('../utils/ensure');
const { updateRow } = require('../utils/sql');
const Equipment = require('../models/equipmentModel');

exports.list = asyncHandler(async (req, res) => ok(res, await Equipment.list(req.query)));
exports.create = asyncHandler(async (req, res) => created(res, { equipment_id: await Equipment.create(req.body) }));
exports.update = asyncHandler(async (req, res) => {
  found(await updateRow('equipment', 'equipment_id', req.params.id, req.body, Equipment.UPDATABLE), 'Equipment');
  ok(res, await Equipment.findById(req.params.id));
});
exports.remove = asyncHandler(async (req, res) => {
  found(await Equipment.remove(req.params.id), 'Equipment');
  ok(res, { deleted: true });
});

exports.maintenanceList = asyncHandler(async (req, res) => ok(res, await Equipment.maintenanceList(req.query)));
exports.maintenanceCreate = asyncHandler(async (req, res) => {
  found(await Equipment.findById(req.body.equipment_id), 'Equipment');
  created(res, { request_id: await Equipment.maintenanceCreate(req.body.equipment_id, req.user.id, req.body.issue) });
});
exports.maintenanceUpdate = asyncHandler(async (req, res) => {
  found(await Equipment.maintenanceUpdate(req.params.id, req.body.status, req.body.repair_cost ?? 0), 'Maintenance request');
  ok(res, { updated: true });
});
