const { query } = require('../config/db');
const ApiError = require('./ApiError');

// Builds "UPDATE table SET a=?,b=? WHERE id=?" from only the allowed fields that were sent.
// table / idCol / allowed are code constants (never user input), values are always bound.
exports.updateRow = async (table, idCol, id, body, allowed) => {
  const keys = allowed.filter(k => body[k] !== undefined);
  if (!keys.length) throw new ApiError(400, 'VALIDATION_ERROR', 'No valid fields to update');
  const r = await query(`UPDATE ${table} SET ${keys.map(k => `${k}=?`).join(',')} WHERE ${idCol}=?`,
    [...keys.map(k => body[k]), id]);
  return r.affectedRows;
};
