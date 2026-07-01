const httpStatus = require('http-status');

const { Notification, User } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');

const DAILY_BROADCAST_LIMIT = 5;
const BROADCAST_TYPES = ['breaking_news', 'trending_news'];

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const createNotification = async ({ recipient, sender, type, data = {} }) => {
  // Never notify yourself
  if (sender && sender.toString() === recipient.toString()) return null;

  const recipientUser = await User.findById(recipient).select('notificationSettings');
  if (!recipientUser) return null;

  const { notificationSettings: settings } = recipientUser;

  // Respect per-type toggles
  if (type === 'breaking_news' && !settings.breakingNews) return null;
  if (type === 'trending_news' && !settings.trendingNews) return null;

  // Rate-limit broadcast types to 5 per recipient per day
  if (BROADCAST_TYPES.includes(type)) {
    const count = await Notification.countDocuments({
      recipient,
      type,
      createdAt: { $gte: todayStart() },
    });
    if (count >= DAILY_BROADCAST_LIMIT) return null;
  }

  return Notification.create({ recipient, sender: sender || null, type, data });
};

const listNotifications = async (userId, query) => {
  const filter = { recipient: userId };
  if (query.unread === 'true') filter.read = false;
  return paginate(Notification, filter, query.page, query.limit, [['sender', 'name avatar']]);
};

const getUnreadCount = async (userId) => Notification.countDocuments({ recipient: userId, read: false });

const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  if (!notification.read) {
    notification.read = true;
    await notification.save();
  }
  return notification;
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany({ recipient: userId, read: false }, { read: true });
};

const deleteAll = async (userId) => {
  await Notification.deleteMany({ recipient: userId });
};

const getSettings = (user) => user.notificationSettings;

const updateSettings = async (user, body) => {
  const allowed = ['push', 'email', 'breakingNews', 'trendingNews'];
  allowed.forEach((key) => {
    if (body[key] !== undefined) {
      user.notificationSettings[key] = body[key];
    }
  });
  await user.save();
  return user.notificationSettings;
};

// Notify all followers of a user (used for live_started, campaign_started)
const notifyFollowers = async (senderId, type, data = {}) => {
  const sender = await User.findById(senderId).select('followers');
  if (!sender || !sender.followers.length) return;
  await Promise.all(
    sender.followers.map((followerId) =>
      createNotification({ recipient: followerId, sender: senderId, type, data }).catch(() => {}),
    ),
  );
};

// Broadcast to all users (breaking_news, trending_news) — respects per-user toggles and daily limit
const broadcastToAll = async (type, data = {}) => {
  const users = await User.find({ isDeleted: false }).select('_id');
  await Promise.all(
    users.map((u) => createNotification({ recipient: u._id, type, data }).catch(() => {})),
  );
};

// Send a targeted admin notification to a specific user
const sendAdminNotification = async (recipientId, type, message) => {
  const user = await User.findById(recipientId);
  if (!user || user.isDeleted) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  return createNotification({ recipient: recipientId, type, data: { message } });
};

module.exports = {
  broadcastToAll,
  createNotification,
  deleteAll,
  getSettings,
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  notifyFollowers,
  sendAdminNotification,
  updateSettings,
};
