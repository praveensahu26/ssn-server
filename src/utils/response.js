const sendSuccess = (res, statusCode, message, data, meta) =>
  res.status(statusCode).send({
    success: true,
    statusCode,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  });

const sendError = (res, statusCode, message) =>
  res.status(statusCode).send({
    success: false,
    statusCode,
    message,
  });

module.exports = {
  sendSuccess,
  sendError,
};
