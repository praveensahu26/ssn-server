const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const NOTIFICATION_TYPES = [
  'follow',
  'follow_accepted',
  'message',
  'comment',
  'like',
  'share',
  'live_started',
  'live_scheduled',
  'campaign_started',
  'breaking_news',
  'trending_news',
  'admin_warning',
  'admin_blocked',
  'admin_suspended',
];

const notificationSchema = mongoose.Schema(
  {
    recipient: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    read: { type: Boolean, default: false },
    data: {
      newsId: { type: mongoose.SchemaTypes.ObjectId, ref: 'News', default: null },
      commentId: { type: mongoose.SchemaTypes.ObjectId, ref: 'Comment', default: null },
      campaignId: { type: mongoose.SchemaTypes.ObjectId, ref: 'Campaign', default: null },
      scheduledAt: { type: Date, default: null },
      message: { type: String, default: null },
    },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

notificationSchema.plugin(toJSON);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES };
