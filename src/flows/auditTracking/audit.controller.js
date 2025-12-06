const { catchAsync, response, n8nClient } = require('../../common');

/**
 * Get all audit logs
 */
const getAuditLogs = catchAsync(async (req, res) => {
  const result = await n8nClient.triggerWebhook('audit/logs', req.query, 'POST');
  return response.success(res, result, 'Audit logs retrieved successfully');
});

/**
 * Get audit logs for specific document
 */
const getDocumentAuditLogs = catchAsync(async (req, res) => {
  const { documentId } = req.params;
  const result = await n8nClient.triggerWebhook('audit/document-logs', { documentId });
  return response.success(res, result, 'Document audit logs retrieved successfully');
});

/**
 * Create audit log entry
 */
const createAuditLog = catchAsync(async (req, res) => {
  const result = await n8nClient.triggerWebhook('audit/create', req.body);
  return response.created(res, result, 'Audit log created successfully');
});

module.exports = {
  getAuditLogs,
  getDocumentAuditLogs,
  createAuditLog,
};
