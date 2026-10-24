const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const authService = require('../services/authService');
const User = require('../models/userModel');
const { found } = require('../utils/ensure');

exports.login = asyncHandler(async (req, res) => ok(res, await authService.login(req.body.username, req.body.password)));
exports.register = asyncHandler(async (req, res) => created(res, await authService.register(req.body)));
exports.me = asyncHandler(async (req, res) => {
  const u = found(await User.findById(req.user.id), 'User');
  ok(res, { ...u, member_id: req.user.member_id, trainer_id: req.user.trainer_id });
});
