const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const paginate = require('../utils/pagination');
const attendanceService = require('../services/attendanceService');
const Attendance = require('../models/attendanceModel');

exports.checkIn = asyncHandler(async (req, res) => created(res, await attendanceService.checkIn(req.body.member_id)));
exports.checkOut = asyncHandler(async (req, res) => ok(res, await attendanceService.checkOut(req.body.member_id)));
exports.list = asyncHandler(async (req, res) => {
  const pg = paginate.parse(req);
  const { rows, total } = await Attendance.list({ date: req.query.date, member_id: req.query.member_id }, pg);
  ok(res, rows, paginate.meta(pg.page, pg.limit, total));
});
exports.analytics = asyncHandler(async (req, res) => ok(res, await Attendance.analytics()));
