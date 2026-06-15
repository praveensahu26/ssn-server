const httpStatus = require('http-status');

const { authService, emailService, tokenService } = require('../services');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  const message = user.isSuperAdmin ? 'Super admin logged in successfully' : 'Admin logged in successfully';

  sendSuccess(res, httpStatus.OK, message, { user, tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const user = await authService.getUserByEmail(req.body.email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const otp = await authService.setUserOtp(user);
  await emailService.sendResetPasswordEmail(user, otp);

  sendSuccess(res, httpStatus.OK, 'Password reset email sent successfully');
});

const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp, type } = req.body;
  const user = await authService.verifyOtp(email, otp);

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  if (type === 'email-verification') {
    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return sendSuccess(res, httpStatus.OK, 'Email verified successfully', { user });
  }

  return sendSuccess(res, httpStatus.OK, 'OTP verified successfully. You can now reset your password.');
});

const sendOtp = catchAsync(async (req, res) => {
  const user = await authService.getUserByEmail(req.body.email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const otp = await authService.setUserOtp(user);
  await emailService.sendVerificationEmail(user, otp);

  sendSuccess(res, httpStatus.OK, 'Verification code sent successfully');
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.getUserByEmail(email);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (await user.isPasswordMatch(password)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New password must be different from current password');
  }

  user.password = password;
  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();

  sendSuccess(res, httpStatus.OK, 'Password reset successfully');
});

module.exports = {
  forgotPassword,
  login,
  resetPassword,
  sendOtp,
  verifyOtp,
};
