const express = require('express');

const { dashboardController } = require('../../controllers');
const { authenticate, requireAdmin } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { dashboardValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/stats', validate(dashboardValidation.getStats), dashboardController.getStats);

module.exports = router;
