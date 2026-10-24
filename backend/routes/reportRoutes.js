const router = require('express').Router();
const { authorize } = require('../middleware/auth');
router.get('/revenue', authorize('admin'), require('../controllers/paymentController').revenue);
module.exports = router;
