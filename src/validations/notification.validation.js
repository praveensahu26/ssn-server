const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const listNotifications = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    unread: Joi.string().valid('true', 'false'),
  }),
};

const notificationId = {
  params: Joi.object().keys({ id: objectId.required() }),
};

const updateSettings = {
  body: Joi.object()
    .keys({
      push: Joi.boolean(),
      email: Joi.boolean(),
      breakingNews: Joi.boolean(),
      trendingNews: Joi.boolean(),
    })
    .min(1),
};

const sendAdminNotification = {
  body: Joi.object().keys({
    recipientId: objectId.required(),
    type: Joi.string().valid('admin_warning', 'admin_blocked', 'admin_suspended').required(),
    message: Joi.string().trim().required(),
  }),
};

const broadcastNotification = {
  body: Joi.object().keys({
    type: Joi.string().valid('breaking_news', 'trending_news').required(),
    newsId: objectId,
  }),
};

module.exports = {
  broadcastNotification,
  listNotifications,
  notificationId,
  sendAdminNotification,
  updateSettings,
};
