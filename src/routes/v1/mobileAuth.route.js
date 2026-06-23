const express = require('express');

const { mobileAuthController } = require('../../controllers');
const validate = require('../../middlewares/validate');
const { mobileAuthValidation } = require('../../validations');

const router = express.Router();

router.post('/register', validate(mobileAuthValidation.register), mobileAuthController.register);
router.post('/login', validate(mobileAuthValidation.login), mobileAuthController.login);
router.post('/google', validate(mobileAuthValidation.googleLogin), mobileAuthController.googleLogin);
router.post('/refresh-token', validate(mobileAuthValidation.refreshToken), mobileAuthController.refreshToken);
router.post('/logout', validate(mobileAuthValidation.logout), mobileAuthController.logout);
router.post('/forgot-password', validate(mobileAuthValidation.forgotPassword), mobileAuthController.forgotPassword);
router.post('/verify-otp', validate(mobileAuthValidation.verifyOtp), mobileAuthController.verifyOtp);
router.post('/reset-password', validate(mobileAuthValidation.resetPassword), mobileAuthController.resetPassword);

module.exports = router;
