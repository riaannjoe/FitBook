const parse = (req, maxLimit = 100) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), maxLimit);
  return { page, limit, offset: (page - 1) * limit };
};
const meta = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });
module.exports = { parse, meta };
