const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/response');

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  const message = err.message || httpStatus[statusCode];

  if (next) {
    sendError(res, statusCode, message);
  }
};

module.exports = {
  errorConverter,
  errorHandler,
};
