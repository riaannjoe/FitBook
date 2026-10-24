const ApiError = require('../utils/ApiError');

// MySQL error code -> [http status, our code, friendly message]
const sqlMap = {
  ER_DUP_ENTRY: [409, 'DUPLICATE', 'A record with this value already exists (phone, email, username or name must be unique)'],
  ER_NO_REFERENCED_ROW_2: [400, 'INVALID_REFERENCE', 'A referenced record does not exist'],
  ER_ROW_IS_REFERENCED_2: [409, 'IN_USE', 'This record is linked to other data and cannot be deleted'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'VALIDATION_ERROR', 'A value breaks a rule (check dates, amounts and quantities)'],
  ER_BAD_NULL_ERROR: [400, 'VALIDATION_ERROR', 'A required value is missing'],
  ER_TRUNCATED_WRONG_VALUE: [400, 'VALIDATION_ERROR', 'A value has an invalid format'],
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [400, 'VALIDATION_ERROR', 'A value has an invalid format'],
  WARN_DATA_TRUNCATED: [400, 'VALIDATION_ERROR', 'A value is not one of the allowed options'],
  ER_DATA_TOO_LONG: [400, 'VALIDATION_ERROR', 'A value is too long']
};

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  let status = 500, code = 'INTERNAL_ERROR', message = 'Internal server error', details;
  if (err instanceof ApiError) ({ status, code, message, details } = err);
  else if (err.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Request body is not valid JSON'; }
  else if (sqlMap[err.code]) [status, code, message] = sqlMap[err.code];
  else console.error(err);
  res.status(status).json({ success: false, error: { code, message, ...(details && { details }) } });
};
