const router = require('express').Router();
const c = require('../controllers/equipmentController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const K = require('../utils/constants');

router.get('/', c.list);                          // ?status=&category=
router.post('/', authorize('admin'), validate({ required: ['name', 'category'] }), c.create);
router.put('/:id', authorize('admin'), validate({ enums: { status: K.EQUIPMENT_STATUS } }), c.update);
router.delete('/:id', authorize('admin'), c.remove);
module.exports = router;
