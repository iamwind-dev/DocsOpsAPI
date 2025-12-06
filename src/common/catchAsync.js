/**
 * Wrapper để catch async errors trong Express
 * Giúp không phải viết try-catch trong mỗi controller
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
