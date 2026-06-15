const sendSuccess = (res, statusCode, message, data) =>
  res.status(statusCode).send({
    success: true,
    statusCode,
    message,
    ...(data !== undefined && { data }),
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
