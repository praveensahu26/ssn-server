const adminAccountController = require('./adminAccount.controller');
const adminCampaignController = require('./adminCampaign.controller');
const adminCategoryController = require('./adminCategory.controller');
const adminNewsController = require('./adminNews.controller');
const adminReporterController = require('./adminReporter.controller');
const authController = require('./auth.controller');
const campaignController = require('./campaign.controller');
const categoryController = require('./category.controller');
const dashboardController = require('./dashboard.controller');
const mobileAuthController = require('./mobileAuth.controller');
const newsController = require('./news.controller');
const notificationController = require('./notification.controller');
const profileController = require('./profile.controller');
const searchController = require('./search.controller');
const settingsController = require('./settings.controller');
const stripeWebhookController = require('./stripeWebhook.controller');

module.exports = {
  adminAccountController,
  adminCampaignController,
  adminCategoryController,
  adminNewsController,
  adminReporterController,
  authController,
  campaignController,
  categoryController,
  dashboardController,
  mobileAuthController,
  newsController,
  notificationController,
  profileController,
  searchController,
  settingsController,
  stripeWebhookController,
};
