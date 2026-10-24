const router = require('express').Router();
const c = require('../controllers/memberController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const K = require('../utils/constants');

router.get('/', authorize('admin', 'trainer'), c.list);
router.post('/', authorize('admin'),
  validate({ required: ['full_name', 'gender', 'dob', 'phone'], enums: { gender: K.GENDER } }), c.create);
router.get('/:id', authorize('admin', 'trainer'), c.get);
router.put('/:id', authorize('admin'), validate({ enums: { gender: K.GENDER, status: K.MEMBER_STATUS } }), c.update);
router.delete('/:id', authorize('admin'), c.remove);
router.get('/:id/subscriptions', authorize('admin'), c.subscriptions);
router.get('/:id/workout', authorize('admin', 'trainer'), c.workout);
module.exports = router;
