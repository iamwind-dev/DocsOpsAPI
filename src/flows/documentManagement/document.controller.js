const { catchAsync, response, n8nClient } = require('../../common');

/**
 * Get all documents
 */
const getDocuments = catchAsync(async (req, res) => {
  // Trigger n8n webhook để lấy documents
  const result = await n8nClient.triggerWebhook('documents/list', req.query, 'POST');
  return response.success(res, result, 'Documents retrieved successfully');
});

/**
 * Get single document
 */
const getDocument = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await n8nClient.triggerWebhook('documents/get', { id });
  return response.success(res, result, 'Document retrieved successfully');
});

/**
 * Create document
 */
const createDocument = catchAsync(async (req, res) => {
  const result = await n8nClient.triggerWebhook('documents/create', req.body);
  return response.created(res, result, 'Document created successfully');
});

/**
 * Update document
 */
const updateDocument = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await n8nClient.triggerWebhook('documents/update', { id, ...req.body });
  return response.success(res, result, 'Document updated successfully');
});

/**
 * Delete document
 */
const deleteDocument = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await n8nClient.triggerWebhook('documents/delete', { id });
  return response.success(res, result, 'Document deleted successfully');
});

module.exports = {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
};
