const router = require('express').Router();
const c = require('../controllers/subscriptionController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const K = require('../utils/constants');

router.use(authorize('admin'));
router.post('/', validate({ required: ['member_id', 'plan_id', 'method'], enums: { method: K.PAYMENT_METHOD } }), c.subscribe);
router.get('/expiring', c.expiring);              // ?days=7
router.post('/expire-check', c.expireCheck);      // call daily (or from a cron job)
module.exports = router;
