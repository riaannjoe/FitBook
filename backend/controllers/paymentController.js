const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const paginate = require('../utils/pagination');
const Payment = require('../models/paymentModel');

exports.list = asyncHandler(async (req, res) => {
  const pg = paginate.parse(req);
  const { rows, total } = await Payment.list({ member_id: req.query.member_id, status: req.query.status }, pg);
  ok(res, rows, paginate.meta(pg.page, pg.limit, total));
});
exports.revenue = asyncHandler(async (req, res) => ok(res, await Payment.revenue()));
