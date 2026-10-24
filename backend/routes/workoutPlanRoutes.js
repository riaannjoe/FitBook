const router = require('express').Router();
const c = require('../controllers/workoutController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const K = require('../utils/constants');

router.get('/', authorize('admin', 'trainer'), c.plans);   // ?goal=&level=
router.post('/assign', authorize('admin', 'trainer'), validate({ required: ['member_id', 'workout_plan_id'] }), c.assign);
router.post('/', authorize('admin', 'trainer'),
  validate({ required: ['title', 'goal', 'level'], enums: { goal: K.GOAL, level: K.LEVEL } }), c.createPlan);
router.get('/:id', c.planDetail);
module.exports = router;
