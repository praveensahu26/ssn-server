const express = require('express');

const { mobileAuthController } = require('../../controllers');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { mobileAuthValidation } = require('../../validations');

const router = express.Router();

router.get('/me', authenticate, mobileAuthController.getProfile);
router.put('/me', authenticate, validate(mobileAuthValidation.updateProfile), mobileAuthController.updateProfile);

module.exports = router;
