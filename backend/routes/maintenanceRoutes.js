const router = require('express').Router();
const c = require('../controllers/equipmentController');
const { authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const K = require('../utils/constants');

router.get('/', authorize('admin'), c.maintenanceList);   // ?status=
router.post('/', validate({ required: ['equipment_id', 'issue'] }), c.maintenanceCreate);   // any logged-in user can report
router.put('/:id', authorize('admin'), validate({ required: ['status'], enums: { status: K.MAINT_STATUS } }), c.maintenanceUpdate);
module.exports = router;
