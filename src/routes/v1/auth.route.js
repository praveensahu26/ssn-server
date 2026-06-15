const express = require('express');

const { authController } = require('../../controllers');
const validate = require('../../middlewares/validate');
const { authValidation } = require('../../validations');

const router = express.Router();

router.post('/login', validate(authValidation.login), authController.login);
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);
router.post('/verify-otp', validate(authValidation.verifyOtp), authController.verifyOtp);
router.post('/send-otp', validate(authValidation.sendOtp), authController.sendOtp);
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);

module.exports = router;
