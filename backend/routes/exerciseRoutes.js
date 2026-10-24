const router = require('express').Router();
const c = require('../controllers/workoutController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', c.exercises);
router.post('/', authorize('admin', 'trainer'), validate({ required: ['name', 'muscle_group'] }), c.createExercise);
module.exports = router;
