const ok = (res, data = null, meta, status = 200) =>
  res.status(status).json({ success: true, data, ...(meta && { meta }) });
const created = (res, data) => ok(res, data, undefined, 201);
module.exports = { ok, created };
