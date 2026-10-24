const router = require('express').Router();
const c = require('../controllers/planController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', c.list);
router.post('/', authorize('admin'), validate({ required: ['plan_name', 'duration_months', 'price'] }), c.create);
router.put('/:id', authorize('admin'), c.update);
router.delete('/:id', authorize('admin'), c.remove);
module.exports = router;
