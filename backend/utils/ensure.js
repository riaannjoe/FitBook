const ApiError = require('./ApiError');
// throws 404 when value is falsy (null row, 0 affectedRows), otherwise returns it
exports.found = (value, name = 'Record') => {
  if (!value) throw new ApiError(404, 'NOT_FOUND', `${name} not found`);
  return value;
};
