const router = require('express').Router();
const c = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const K = require('../utils/constants');

router.post('/login', validate({ required: ['username', 'password'] }), c.login);
router.get('/me', authenticate, c.me);
// only an admin can create logins (fixes the old open /register endpoint)
router.post('/register', authenticate, authorize('admin'),
  validate({ required: ['username', 'password', 'role'], enums: { role: K.ROLE } }), c.register);
module.exports = router;
