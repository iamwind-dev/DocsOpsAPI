const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const { apiKeyAuth } = require('../../middlewares'); // Use apiKeyAuth if deemed necessary for internal calls, or authSupabase for user-facing

// Existing
router.get('/logs', auditController.getAuditLogs); // Now returns enriched logs + stats
router.get('/logs/:documentId', auditController.getDocumentAuditLogs);
router.post('/log', auditController.createAuditLog);

// New Routes
router.get('/latest-result', auditController.getLatestResult);
router.post('/analysis-result', auditController.receiveAnalysisResult); // Webhook from N8N
router.post('/analyze', auditController.analyzeAuditLogs);
router.get('/results', auditController.getAllResults);
router.get('/results/:id', auditController.getResultById);
router.delete('/results/:id', auditController.deleteResult);
router.get('/stats', auditController.getStats);
router.post('/trigger-analysis', auditController.triggerAnalysis);

module.exports = router;
