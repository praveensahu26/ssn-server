const httpStatus = require('http-status');

const { Token, User } = require('../models');
const ApiError = require('../utils/ApiError');
const googleAuthService = require('./googleAuth.service');
const tokenService = require('./token.service');

const MOBILE_ROLES = ['user', 'reporter', 'reporter_pending'];

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const setUserOtp = async (user) => {
  const otp = generateOtp();
  user.set({
    otp,
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  await user.save();
  return otp;
};

const getUserByEmail = async (email) => User.findOne({ email: email.toLowerCase() });

const getUserByEmailOrMobile = async (identifier) =>
  User.findOne({ $or: [{ email: identifier.toLowerCase() }, { mobile: identifier }] });

/**
 * Complete the profile of an already-authenticated account (created by `loginWithGoogle`
 * or another social login). If `journalistId` is in the payload, the caller is applying as
 * a reporter: flip `isReporter`, demote the role to `reporter_pending`, and mark the
 * `reporterProfile` as pending admin approval. A normal user gets none of that.
 */
const register = async (user, body) => {
  const { name, email, mobile, gender, journalistId } = body;

  if (email && email.toLowerCase() !== user.email && (await User.isEmailTaken(email, user.id))) {
    throw new ApiError(httpStatus.CONFLICT, 'Email already in use');
  }
  if (mobile && mobile !== user.mobile && (await User.isMobileTaken(mobile, user.id))) {
    throw new ApiError(httpStatus.CONFLICT, 'Mobile number already in use');
  }

  const isReporter = Boolean(journalistId);

  user.set({
    name,
    email,
    mobile,
    gender: gender || null,
    ...(isReporter && {
      isReporter: true,
      role: 'reporter_pending',
      reporterProfile: {
        journalistId,
        approvalStatus: 'pending',
        appliedAt: new Date(),
        rejectionReason: null,
      },
    }),
  });
  await user.save();

  return user;
};

const loginUserWithOtp = async (identifier, otp) => {
  const user = await getUserByEmailOrMobile(identifier);

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'No account found with this email or mobile.');
  }

  if (user.isDeleted) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Your account has been deleted. Please contact support for assistance.');
  }

  if (user.status === 'blocked') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Your account has been blocked. Please contact support.');
  }

  if (!MOBILE_ROLES.includes(user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Please use the admin panel to sign in.');
  }

  if (!user.otp || user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP.');
  }

  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();

  return user;
};

const assertLoginable = (user) => {
  if (user.isDeleted) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Your account has been deleted. Please contact support for assistance.');
  }
  if (user.status === 'blocked') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Your account has been blocked. Please contact support.');
  }
};

/**
 * Sign in (or sign up) with a Google ID token issued to the client. The token is
 * verified server-side, then we find-or-create a bare `user` account from its claims.
 * Whether the account is a reporter is decided later, in `register`, once the
 * client submits the rest of the profile (including `journalistId`).
 */
const loginWithGoogle = async (idToken) => {
  const decoded = await googleAuthService.verifyIdToken(idToken);
  const { uid, email, name, picture, email_verified: emailVerified } = decoded;

  if (!email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Google account has no email address');
  }

  // Existing account by Google uid, or by email (link Google to a local account).
  let user = await User.findOne({ $or: [{ googleId: uid }, { email: email.toLowerCase() }] });

  if (user) {
    assertLoginable(user);
    if (!user.googleId) {
      user.googleId = uid;
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
      await user.save();
    }
    return user;
  }

  user = await User.create({
    name: name || email.split('@')[0],
    email,
    avatar: picture || null,
    googleId: uid,
    authProvider: 'google',
    role: 'user',
    status: 'active',
    isVerified: Boolean(emailVerified),
  });

  return user;
};

/**
 * Rotate tokens: validate the refresh token, delete it, and issue a fresh pair.
 */
const refreshAuth = async (refreshToken) => {
  const tokenDoc = await tokenService.verifyToken(refreshToken, tokenService.tokenTypes.REFRESH);
  const user = await User.findById(tokenDoc.user);

  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  await Token.deleteOne({ _id: tokenDoc._id });
  return tokenService.generateAuthTokens(user);
};

const logout = async (refreshToken) => {
  const tokenDoc = await Token.findOne({ token: refreshToken, type: tokenService.tokenTypes.REFRESH });
  if (!tokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Token not found');
  }
  await Token.deleteOne({ _id: tokenDoc._id });
};

const verifyOtp = async (email, otp) =>
  User.findOne({
    email: email.toLowerCase(),
    otp,
    otpExpiresAt: { $gt: new Date() },
  });

const resetPassword = async (email, otp, password) => {
  const user = await verifyOtp(email, otp);
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  user.password = password;
  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();
  return user;
};

/**
 * Submit/resubmit reporter onboarding documents. Promotes a plain user to
 * `reporter_pending`; rejected reporters can resubmit. Already-approved
 * reporters cannot re-apply.
 */
const applyAsReporter = async (user, documents) => {
  if (user.role === 'reporter') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You are already an approved reporter');
  }

  user.set({
    role: 'reporter_pending',
    isReporter: true,
    reporterProfile: {
      documents,
      approvalStatus: 'pending',
      appliedAt: new Date(),
      rejectionReason: null,
    },
  });
  await user.save();
  return user;
};

const updateProfile = async (user, body) => {
  if (body.mobile && body.mobile !== user.mobile && (await User.isMobileTaken(body.mobile, user.id))) {
    throw new ApiError(httpStatus.CONFLICT, 'Mobile number already in use');
  }

  const allowed = ['name', 'avatar', 'gender', 'mobile'];
  const updates = allowed.reduce((acc, field) => {
    if (body[field] !== undefined) {
      acc[field] = body[field];
    }
    return acc;
  }, {});

  user.set(updates);
  await user.save();
  return user;
};

module.exports = {
  applyAsReporter,
  getUserByEmail,
  getUserByEmailOrMobile,
  loginUserWithOtp,
  loginWithGoogle,
  logout,
  refreshAuth,
  register,
  resetPassword,
  setUserOtp,
  updateProfile,
  verifyOtp,
};
