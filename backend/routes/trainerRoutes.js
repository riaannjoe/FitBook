const router = require('express').Router();
const c = require('../controllers/trainerController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const K = require('../utils/constants');

router.get('/', c.list);
router.post('/', authorize('admin'), validate({ required: ['full_name', 'phone', 'hire_date'] }), c.create);
router.get('/:id', c.get);
router.put('/:id', authorize('admin'), c.update);
router.delete('/:id', authorize('admin'), c.remove);

router.get('/:id/schedule', c.schedule);
router.post('/:id/schedule', authorize('admin'),
  validate({ required: ['day_of_week', 'start_time', 'end_time'], enums: { day_of_week: K.DAY } }), c.addSlot);
router.delete('/:id/schedule/:slotId', authorize('admin'), c.removeSlot);
router.get('/:id/clients', authorize('admin', 'trainer'), c.clients);
module.exports = router;
