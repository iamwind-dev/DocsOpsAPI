const { catchAsync, response, n8nClient } = require('../../common');

/**
 * Get all archives
 */
const getArchives = catchAsync(async (req, res) => {
  const result = await n8nClient.triggerWebhook('archive/list', req.query, 'POST');
  return response.success(res, result, 'Archives retrieved successfully');
});

/**
 * Get single archive
 */
const getArchive = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await n8nClient.triggerWebhook('archive/get', { id });
  return response.success(res, result, 'Archive retrieved successfully');
});

/**
 * Archive a document
 */
const archiveDocument = catchAsync(async (req, res) => {
  const result = await n8nClient.triggerWebhook('archive/create', req.body);
  return response.created(res, result, 'Document archived successfully');
});

/**
 * Restore archived document
 */
const restoreDocument = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await n8nClient.triggerWebhook('archive/restore', { id, ...req.body });
  return response.success(res, result, 'Document restored successfully');
});

/**
 * Delete archive permanently
 */
const deleteArchive = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await n8nClient.triggerWebhook('archive/delete', { id });
  return response.success(res, result, 'Archive deleted successfully');
});

module.exports = {
  getArchives,
  getArchive,
  archiveDocument,
  restoreDocument,
  deleteArchive,
};
