const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.use('/auth', require('./authRoutes'));      // login is public, the rest is guarded inside

router.use(authenticate);                           // everything below needs a valid token
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/me', require('./meRoutes'));
router.use('/members', require('./memberRoutes'));
router.use('/plans', require('./planRoutes'));
router.use('/subscriptions', require('./subscriptionRoutes'));
router.use('/trainers', require('./trainerRoutes'));
router.use('/assignments', require('./assignmentRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/exercises', require('./exerciseRoutes'));
router.use('/workout-plans', require('./workoutPlanRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/equipment', require('./equipmentRoutes'));
router.use('/maintenance', require('./maintenanceRoutes'));

module.exports = router;
