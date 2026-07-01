const express = require('express');

const adminAuthRoute = require('./auth.route');
const adminCampaignRoute = require('./adminCampaign.route');
const adminCategoryRoute = require('./adminCategory.route');
const adminNotificationRoute = require('./adminNotification.route');
const adminReporterRoute = require('./adminReporter.route');
const campaignRoute = require('./campaign.route');
const categoryRoute = require('./category.route');
const dashboardRoute = require('./dashboard.route');
const docsRoute = require('./docs.route');
const mobileAuthRoute = require('./mobileAuth.route');
const newsRoute = require('./news.route');
const notificationRoute = require('./notification.route');
const profileRoute = require('./profile.route');
const reporterRoute = require('./reporter.route');
const settingsRoute = require('./settings.route');

const router = express.Router();

router.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

router.use('/docs', docsRoute);

// Mobile app (users + reporters)
router.use('/auth', mobileAuthRoute);
router.use('/categories', categoryRoute);
router.use('/notifications', notificationRoute);
router.use('/profile', profileRoute);
router.use('/reporters', reporterRoute);
router.use('/settings', settingsRoute);

// Shared (role-branches internally: mobile users/reporters vs web admin panel)
router.use('/campaigns', campaignRoute);
router.use('/news', newsRoute);

// Web admin panel
router.use('/admin/auth', adminAuthRoute);
router.use('/admin/campaigns', adminCampaignRoute);
router.use('/admin/categories', adminCategoryRoute);
router.use('/admin/dashboard', dashboardRoute);
router.use('/admin/notifications', adminNotificationRoute);
router.use('/admin/reporters', adminReporterRoute);

module.exports = router;

