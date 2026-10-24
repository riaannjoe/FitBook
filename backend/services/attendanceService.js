const Attendance = require('../models/attendanceModel');
const Member = require('../models/memberModel');
const Sub = require('../models/subscriptionModel');
const ApiError = require('../utils/ApiError');
const { found } = require('../utils/ensure');

exports.checkIn = async memberId => {
  const m = found(await Member.findById(memberId), 'Member');
  if (m.status === 'suspended') throw new ApiError(403, 'MEMBER_SUSPENDED', 'Member is suspended');
  if (!(await Sub.currentOf(memberId))) throw new ApiError(400, 'NO_ACTIVE_MEMBERSHIP', 'No active membership');
  if (await Attendance.openFor(memberId)) throw new ApiError(409, 'ALREADY_CHECKED_IN', 'Member is already checked in');
  return { attendance_id: await Attendance.checkIn(memberId) };
};

exports.checkOut = async memberId => {
  if (!(await Attendance.checkOut(memberId))) throw new ApiError(404, 'NOT_CHECKED_IN', 'Member has no open check-in');
  return { member_id: memberId };
};
