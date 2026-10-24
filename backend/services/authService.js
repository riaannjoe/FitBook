const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const ApiError = require('../utils/ApiError');

exports.login = async (username, password) => {
  const u = await User.findByUsername(username);
  if (!u || !(await bcrypt.compare(password, u.password_hash)))
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
  const member_id = u.role === 'member' ? await User.memberIdOf(u.user_id) : null;
  const trainer_id = u.role === 'trainer' ? await User.trainerIdOf(u.user_id) : null;
  const user = { id: u.user_id, username: u.username, role: u.role, member_id, trainer_id };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '8h' });
  return { token, user };
};

// creates a login; optionally links it to an existing member / trainer profile
exports.register = async ({ username, password, role, member_id, trainer_id }) => {
  if (String(password).length < 6) throw new ApiError(400, 'VALIDATION_ERROR', 'Password must be at least 6 characters');
  const id = await User.create(username, await bcrypt.hash(password, 10), role);
  if (role === 'member' && member_id) await User.linkMember(id, member_id);
  if (role === 'trainer' && trainer_id) await User.linkTrainer(id, trainer_id);
  return { user_id: id };
};
