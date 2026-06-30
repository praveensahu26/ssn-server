const adminCampaignController = require('./adminCampaign.controller');
const adminCategoryController = require('./adminCategory.controller');
const adminReporterController = require('./adminReporter.controller');
const authController = require('./auth.controller');
const campaignController = require('./campaign.controller');
const categoryController = require('./category.controller');
const mobileAuthController = require('./mobileAuth.controller');
const newsController = require('./news.controller');
const profileController = require('./profile.controller');
const settingsController = require('./settings.controller');
const stripeWebhookController = require('./stripeWebhook.controller');

module.exports = {
  adminCampaignController,
  adminCategoryController,
  adminReporterController,
  authController,
  campaignController,
  categoryController,
  mobileAuthController,
  newsController,
  profileController,
  settingsController,
  stripeWebhookController,
};
