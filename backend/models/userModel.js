const { query } = require('../config/db');
exports.findByUsername = async u => (await query('SELECT * FROM users WHERE username=?', [u]))[0];
exports.findById = async id => (await query('SELECT user_id,username,role,created_at FROM users WHERE user_id=?', [id]))[0];
exports.create = async (username, hash, role) =>
  (await query('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)', [username, hash, role])).insertId;
exports.memberIdOf = async uid => (await query('SELECT member_id FROM members WHERE user_id=?', [uid]))[0]?.member_id || null;
exports.trainerIdOf = async uid => (await query('SELECT trainer_id FROM trainers WHERE user_id=?', [uid]))[0]?.trainer_id || null;
exports.linkMember = (uid, mid) => query('UPDATE members SET user_id=? WHERE member_id=?', [uid, mid]);
exports.linkTrainer = (uid, tid) => query('UPDATE trainers SET user_id=? WHERE trainer_id=?', [uid, tid]);
