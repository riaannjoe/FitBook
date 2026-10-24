const ApiError = require('../utils/ApiError');

// validate({ required: ['a','b'], enums: { gender: ['M','F','O'] } })
module.exports = (rules = {}) => (req, res, next) => {
  const body = req.body || {};
  const details = [];
  for (const f of rules.required || [])
    if (body[f] === undefined || body[f] === null || body[f] === '') details.push({ field: f, message: 'is required' });
  for (const [f, allowed] of Object.entries(rules.enums || {}))
    if (body[f] !== undefined && !allowed.includes(body[f])) details.push({ field: f, message: `must be one of: ${allowed.join(', ')}` });
  if (details.length) return next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data', details));
  next();
};
