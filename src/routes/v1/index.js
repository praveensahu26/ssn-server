const express = require('express');

const adminAuthRoute = require('./auth.route');
const mobileAuthRoute = require('./mobileAuth.route');
const profileRoute = require('./profile.route');
const reporterRoute = require('./reporter.route');

const router = express.Router();

router.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

// Mobile app (users + reporters)
router.use('/auth', mobileAuthRoute);
router.use('/profile', profileRoute);
router.use('/reporters', reporterRoute);

// Web admin panel
router.use('/admin/auth', adminAuthRoute);

module.exports = router;
