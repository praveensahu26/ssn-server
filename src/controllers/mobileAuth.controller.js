const httpStatus = require('http-status');

const { emailService, mobileAuthService, tokenService } = require('../services');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const buildOnboardingFlags = (user) => {
  const flags = {
    isProfilePending: !user.mobile || !user.gender,
    isTopicsSelectionPending: user.followedCategories.length === 0,
    isAgencyReporter: user.isAgencyReporter,
  };

  // Include verification object for agency reporters
  if (user.isAgencyReporter) {
    const statusMap = {
      pending: 'PENDING',
      approved: 'VERIFIED',
      rejected: 'REJECTED',
    };
    const verificationStatus = user.reporterProfile?.approvalStatus
      ? statusMap[user.reporterProfile.approvalStatus] || 'PENDING'
      : 'PENDING';
    flags.verification = { status: verificationStatus };
  }

  return flags;
};

const register = catchAsync(async (req, res) => {
  const user = await mobileAuthService.register(req.user, req.body);
  const tokens = await tokenService.generateAuthTokens(user);

  const message =
    user.role === 'reporter_pending'
      ? 'Profile updated successfully. Your reporter application is pending admin approval.'
      : 'Profile updated successfully';

  sendSuccess(res, httpStatus.OK, message, {
    tokens,
    ...buildOnboardingFlags(user),
  });
});

const login = catchAsync(async (req, res) => {
  const { identifier, otp } = req.body;
  const user = await mobileAuthService.loginUserWithOtp(identifier, otp);
  const tokens = await tokenService.generateAuthTokens(user);

  sendSuccess(res, httpStatus.OK, 'Logged in successfully', {
    tokens,
    ...buildOnboardingFlags(user),
  });
});

const googleLogin = catchAsync(async (req, res) => {
  const user = await mobileAuthService.loginWithGoogle(req.body.idToken);
  const tokens = await tokenService.generateAuthTokens(user);

  sendSuccess(res, httpStatus.OK, 'Logged in successfully', {
    tokens,
    ...buildOnboardingFlags(user),
  });
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
  
  const responseData = { user };

  // Include verification object for agency reporters
  if (user.isAgencyReporter) {
    const statusMap = {
      pending: 'PENDING',
      approved: 'VERIFIED',
      rejected: 'REJECTED',
    };
    const verificationStatus = user.reporterProfile?.approvalStatus
      ? statusMap[user.reporterProfile.approvalStatus] || 'PENDING'
      : 'PENDING';
    responseData.verification = { status: verificationStatus };
  }

  sendSuccess(res, httpStatus.OK, 'Reporter application submitted. It is pending admin approval.', responseData);
});

const getProfile = catchAsync(async (req, res) => {
  const user = req.user;
  
  const responseData = { user };

  // Include verification object for agency reporters
  if (user.isAgencyReporter) {
    const statusMap = {
      pending: 'PENDING',
      approved: 'VERIFIED',
      rejected: 'REJECTED',
    };
    const verificationStatus = user.reporterProfile?.approvalStatus
      ? statusMap[user.reporterProfile.approvalStatus] || 'PENDING'
      : 'PENDING';
    responseData.verification = { status: verificationStatus };
  }

  sendSuccess(res, httpStatus.OK, 'Profile fetched successfully', responseData);
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await mobileAuthService.updateProfile(req.user, req.body);
  
  const responseData = { user };

  // Include verification object for agency reporters
  if (user.isAgencyReporter) {
    const statusMap = {
      pending: 'PENDING',
      approved: 'VERIFIED',
      rejected: 'REJECTED',
    };
    const verificationStatus = user.reporterProfile?.approvalStatus
      ? statusMap[user.reporterProfile.approvalStatus] || 'PENDING'
      : 'PENDING';
    responseData.verification = { status: verificationStatus };
  }

  sendSuccess(res, httpStatus.OK, 'Profile updated successfully', responseData);
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
