const express = require('express');

const { mobileAuthController } = require('../../controllers');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { mobileAuthValidation } = require('../../validations');

const router = express.Router();

router.post('/apply', authenticate, validate(mobileAuthValidation.applyAsReporter), mobileAuthController.applyAsReporter);

module.exports = router;
