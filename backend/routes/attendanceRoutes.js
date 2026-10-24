const router = require('express').Router();
const c = require('../controllers/attendanceController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authorize('admin'));
router.post('/check-in', validate({ required: ['member_id'] }), c.checkIn);
router.post('/check-out', validate({ required: ['member_id'] }), c.checkOut);
router.get('/analytics', c.analytics);
router.get('/', c.list);                          // ?date=YYYY-MM-DD&member_id=&page=&limit=
module.exports = router;
