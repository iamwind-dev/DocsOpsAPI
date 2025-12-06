const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');

// Audit tracking routes
router.get('/logs', auditController.getAuditLogs);
router.get('/logs/:documentId', auditController.getDocumentAuditLogs);
router.post('/log', auditController.createAuditLog);

module.exports = router;
