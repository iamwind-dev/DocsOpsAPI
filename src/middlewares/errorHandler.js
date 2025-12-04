const { httpStatus, ApiError } = require('../common');
const config = require('../config');

/**
 * Convert error to ApiError nếu cần
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

/**
 * Handle error và trả response
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (config.nodeEnv === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};
