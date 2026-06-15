const httpStatus = require('http-status');

const { User } = require('../models');
const ApiError = require('../utils/ApiError');

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

const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await getUserByEmail(email);

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email not found. Please check your credentials.');
  }

  if (user.isDeleted) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Your account has been deleted. Please contact support for assistance.');
  }

  if (!(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect password. Please try again.');
  }

  if (!user.isVerified) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please verify your email before logging in.');
  }

  if (!user.isSuperAdmin && !user.isOperator()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access the admin panel.');
  }

  return user;
};

const verifyOtp = async (email, otp) =>
  User.findOne({
    email: email.toLowerCase(),
    otp,
    otpExpiresAt: { $gt: new Date() },
  });

module.exports = {
  getUserByEmail,
  loginUserWithEmailAndPassword,
  setUserOtp,
  verifyOtp,
};
