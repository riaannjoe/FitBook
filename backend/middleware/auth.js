const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

exports.authenticate = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(new ApiError(401, 'UNAUTHORIZED', 'Login required'));
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token')); }
};

exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, 'FORBIDDEN', 'You do not have access to this resource'));
