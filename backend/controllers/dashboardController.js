const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const Dashboard = require('../models/dashboardModel');
exports.summary = asyncHandler(async (req, res) => ok(res, await Dashboard.summary()));
