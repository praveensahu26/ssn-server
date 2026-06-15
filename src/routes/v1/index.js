const express = require('express');

const authRoute = require('./auth.route');

const router = express.Router();

router.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

router.use('/auth', authRoute);

module.exports = router;
