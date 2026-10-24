const router = require('express').Router();
const { authorize } = require('../middleware/auth');
router.get('/', authorize('admin'), require('../controllers/paymentController').list);   // ?member_id=&status=
module.exports = router;
