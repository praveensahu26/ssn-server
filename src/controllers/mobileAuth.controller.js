const httpStatus = require('http-status');

const { emailService, mobileAuthService, tokenService } = require('../services');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const register = catchAsync(async (req, res) => {
  const user = await mobileAuthService.register(req.body);
  const tokens = await tokenService.generateAuthTokens(user);

  const message =
    user.role === 'reporter_pending'
      ? 'Registration successful. Your reporter application is pending admin approval.'
      : 'Registration successful';

  sendSuccess(res, httpStatus.CREATED, message, { user, tokens });
});

const login = catchAsync(async (req, res) => {
  const { identifier, password } = req.body;
  const user = await mobileAuthService.loginUserWithEmailOrMobile(identifier, password);
  const tokens = await tokenService.generateAuthTokens(user);

  sendSuccess(res, httpStatus.OK, 'Logged in successfully', { user, tokens });
});

const googleLogin = catchAsync(async (req, res) => {
  const user = await mobileAuthService.loginWithGoogle(req.body.idToken);
  const tokens = await tokenService.generateAuthTokens(user);

  sendSuccess(res, httpStatus.OK, 'Logged in successfully', { user, tokens });
});

const refreshToken = catchAsync(async (req, res) => {
  const tokens = await mobileAuthService.refreshAuth(req.body.refreshToken);
  sendSuccess(res, httpStatus.OK, 'Token refreshed successfully', { tokens });
});

const logout = catchAsync(async (req, res) => {
  await mobileAuthService.logout(req.body.refreshToken);
  sendSuccess(res, httpStatus.OK, 'Logged out successfully');
});

const forgotPassword = catchAsync(async (req, res) => {
  const user = await mobileAuthService.getUserByEmail(req.body.email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const otp = await mobileAuthService.setUserOtp(user);
  await emailService.sendResetPasswordEmail(user, otp);

  sendSuccess(res, httpStatus.OK, 'Password reset code sent successfully');
});

const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const user = await mobileAuthService.verifyOtp(email, otp);

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  sendSuccess(res, httpStatus.OK, 'OTP verified successfully. You can now reset your password.');
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, otp, password } = req.body;
  await mobileAuthService.resetPassword(email, otp, password);
  sendSuccess(res, httpStatus.OK, 'Password reset successfully');
});

const applyAsReporter = catchAsync(async (req, res) => {
  const user = await mobileAuthService.applyAsReporter(req.user, req.body.documents);
  sendSuccess(res, httpStatus.OK, 'Reporter application submitted. It is pending admin approval.', { user });
});

const getProfile = catchAsync(async (req, res) => {
  sendSuccess(res, httpStatus.OK, 'Profile fetched successfully', { user: req.user });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await mobileAuthService.updateProfile(req.user, req.body);
  sendSuccess(res, httpStatus.OK, 'Profile updated successfully', { user });
});

module.exports = {
  applyAsReporter,
  forgotPassword,
  getProfile,
  googleLogin,
  login,
  logout,
  refreshToken,
  register,
  resetPassword,
  updateProfile,
  verifyOtp,
};
