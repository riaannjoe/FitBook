const router = require('express').Router();
const c = require('../controllers/meController');
const { authorize } = require('../middleware/auth');

// member self-service
router.get('/profile', authorize('member'), c.profile);
router.get('/subscriptions', authorize('member'), c.subscriptions);
router.get('/workout', authorize('member'), c.workout);
router.get('/payments', authorize('member'), c.payments);
router.get('/attendance', authorize('member'), c.attendance);
// trainer self-service
router.get('/clients', authorize('trainer'), c.clients);
module.exports = router;
