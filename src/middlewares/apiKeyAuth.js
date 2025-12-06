const { ApiError, httpStatus } = require('../common');
const config = require('../config');

/**
 * Middleware xác thực API Key
 * Sử dụng cho các endpoint cần bảo mật
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'API key is required'));
  }

  if (apiKey !== config.apiKey) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid API key'));
  }

  next();
};

module.exports = apiKeyAuth;
