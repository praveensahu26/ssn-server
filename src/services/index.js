const adminCampaignService = require('./adminCampaign.service');
const adminReporterService = require('./adminReporter.service');
const authService = require('./auth.service');
const campaignService = require('./campaign.service');
const categoryService = require('./category.service');
const dashboardService = require('./dashboard.service');
const donationService = require('./donation.service');
const emailService = require('./email.service');
const mobileAuthService = require('./mobileAuth.service');
const newsService = require('./news.service');
const s3Service = require('./s3.service');
const settingsService = require('./settings.service');
const tokenService = require('./token.service');

module.exports = {
  adminCampaignService,
  adminReporterService,
  authService,
  campaignService,
  categoryService,
  dashboardService,
  donationService,
  emailService,
  mobileAuthService,
  newsService,
  s3Service,
  settingsService,
  tokenService,
};

