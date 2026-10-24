const router = require('express').Router();
const c = require('../controllers/trainerController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authorize('admin'));
router.post('/', validate({ required: ['trainer_id', 'member_id'] }), c.assign);
router.patch('/:id/end', c.endAssignment);
module.exports = router;
