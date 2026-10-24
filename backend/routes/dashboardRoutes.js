const router = require('express').Router();
const { authorize } = require('../middleware/auth');
router.get('/', authorize('admin'), require('../controllers/dashboardController').summary);
module.exports = router;
