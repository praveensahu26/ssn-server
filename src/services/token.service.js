const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const config = require('../config/config');
const { Token } = require('../models');
const ApiError = require('../utils/ApiError');

const tokenTypes = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

const verifyToken = async (token, type) => {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Session expired. Please log in again.');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid authentication token');
    }
    if (err.name === 'NotBeforeError') {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token not yet valid');
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication failed');
  }

  if (payload.type !== type) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type');
  }

  const tokenDoc = await Token.findOne({ token, type, user: payload.sub, blacklisted: false });
  if (!tokenDoc) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Token not found');
  }

  return tokenDoc;
};

module.exports = {
  generateAuthTokens,
  generateToken,
  saveToken,
  tokenTypes,
  verifyToken,
};
