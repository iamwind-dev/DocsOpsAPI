const { catchAsync, response, n8nClient } = require('../../common');

/**
 * Classify a document
 */
const classifyDocument = catchAsync(async (req, res) => {
  const result = await n8nClient.triggerWebhook('classification/classify', req.body);
  return response.success(res, result, 'Document classified successfully');
});

/**
 * Get all categories
 */
const getCategories = catchAsync(async (req, res) => {
  const result = await n8nClient.triggerWebhook('classification/categories', {}, 'POST');
  return response.success(res, result, 'Categories retrieved successfully');
});

module.exports = {
  classifyDocument,
  getCategories,
};
