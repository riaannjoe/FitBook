const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const subscriptionService = require('../services/subscriptionService');
const Sub = require('../models/subscriptionModel');

exports.subscribe = asyncHandler(async (req, res) => created(res, await subscriptionService.subscribe(req.body)));
exports.expiring = asyncHandler(async (req, res) => ok(res, await Sub.expiring(parseInt(req.query.days) || 7)));
exports.expireCheck = asyncHandler(async (req, res) => ok(res, await Sub.expireCheck()));
