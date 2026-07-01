const express = require('express');

const { notificationController } = require('../../controllers');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { notificationValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate);

// User notification endpoints
router.get('/', validate(notificationValidation.listNotifications), notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/', notificationController.deleteAll);
router.get('/settings', notificationController.getSettings);
router.patch('/settings', validate(notificationValidation.updateSettings), notificationController.updateSettings);
router.patch('/:id/read', validate(notificationValidation.notificationId), notificationController.markAsRead);

module.exports = router;
