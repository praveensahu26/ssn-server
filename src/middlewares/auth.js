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
  requireAdmin,
  requireSuperAdmin,
};
