const express = require('express');

const { notificationController } = require('../../controllers');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { notificationValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate);

// Send targeted admin notification (admin_warning, admin_blocked, admin_suspended)
router.post(
  '/send',
  validate(notificationValidation.sendAdminNotification),
  notificationController.sendAdminNotification,
);

// Broadcast breaking_news or trending_news to all users
router.post(
  '/broadcast',
  validate(notificationValidation.broadcastNotification),
  notificationController.broadcastNotification,
);

module.exports = router;
