const httpStatus = require('http-status');

const { notificationService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const listNotifications = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await notificationService.listNotifications(req.user.id, req.query);
  sendSuccess(res, httpStatus.OK, 'Notifications fetched successfully', {
    notifications: results,
    meta: { page, limit, total, totalPages },
  });
});

const getUnreadCount = catchAsync(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  sendSuccess(res, httpStatus.OK, 'Unread count fetched', { count });
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user.id, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Notification marked as read', { notification });
});

const markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  sendSuccess(res, httpStatus.OK, 'All notifications marked as read');
});

const deleteAll = catchAsync(async (req, res) => {
  await notificationService.deleteAll(req.user.id);
  sendSuccess(res, httpStatus.OK, 'All notifications deleted');
});

const getSettings = catchAsync(async (req, res) => {
  const settings = notificationService.getSettings(req.user);
  sendSuccess(res, httpStatus.OK, 'Notification settings fetched', { settings });
});

const updateSettings = catchAsync(async (req, res) => {
  const settings = await notificationService.updateSettings(req.user, req.body);
  sendSuccess(res, httpStatus.OK, 'Notification settings updated', { settings });
});

// Admin: send targeted notification to a specific user
const sendAdminNotification = catchAsync(async (req, res) => {
  const { recipientId, type, message } = req.body;
  await notificationService.sendAdminNotification(recipientId, type, message);
  sendSuccess(res, httpStatus.OK, 'Notification sent');
});

// Admin: broadcast breaking_news or trending_news to all users
const broadcastNotification = catchAsync(async (req, res) => {
  const { type, newsId } = req.body;
  await notificationService.broadcastToAll(type, { newsId: newsId || null });
  sendSuccess(res, httpStatus.OK, 'Broadcast notification sent');
});

module.exports = {
  broadcastNotification,
  deleteAll,
  getSettings,
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  sendAdminNotification,
  updateSettings,
};
