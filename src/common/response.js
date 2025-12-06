const httpStatus = require('./httpStatus');

/**
 * Success response wrapper
 */
const success = (res, data = null, message = 'Success', statusCode = httpStatus.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Created response wrapper
 */
const created = (res, data = null, message = 'Created successfully') => {
  return success(res, data, message, httpStatus.CREATED);
};

/**
 * Error response wrapper
 */
const error = (res, message = 'Error', statusCode = httpStatus.INTERNAL_SERVER_ERROR, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

/**
 * Paginated response wrapper
 */
const paginated = (res, data, pagination, message = 'Success') => {
  return res.status(httpStatus.OK).json({
    success: true,
    message,
    data,
    pagination,
  });
};

module.exports = {
  success,
  created,
  error,
  paginated,
};
