const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');

const config = require('../config/config');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const authenticate = catchAsync(async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  const payload = jwt.verify(token, config.jwt.secret);
  if (payload.type !== 'access') {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  req.user = user;
  next();
});

// For routes that are publicly viewable but vary their response when the caller happens to be
// authenticated (e.g. an organizer previewing their own pending campaign) — unlike `authenticate`,
// a missing or invalid token is not an error; it just leaves req.user unset.
const optionalAuthenticate = catchAsync(async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.type === 'access') {
      const user = await User.findById(payload.sub);
      if (user && !user.isDeleted) {
        req.user = user;
      }
    }
  } catch {
    // Invalid/expired token on an optional-auth route — treat the caller as anonymous.
  }

  return next();
});

const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.isSuperAdmin || req.user.isOperator())) {
    return next();
  }
  return next(new ApiError(httpStatus.FORBIDDEN, 'Admin access required'));
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.isSuperAdmin) {
    return next();
  }
  return next(new ApiError(httpStatus.FORBIDDEN, 'Super admin access required'));
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    return next(new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to perform this action'));
  };

const checkPermission = (permission) => (req, res, next) => {
  if (req.user && req.user.hasPermission(permission)) {
    return next();
  }
  return next(new ApiError(httpStatus.FORBIDDEN, 'Permission denied'));
};

module.exports = {
  authenticate,
  authorize,
  checkPermission,
  optionalAuthenticate,
  requireAdmin,
  requireSuperAdmin,
};
