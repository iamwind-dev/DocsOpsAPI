const express = require('express');
const router = express.Router();
const auditController = require('../../flows/auditTracking/audit.controller');
const { apiKeyAuth } = require('../../middlewares'); 

// Public Routes (as per audit-tracking-main latest)
router.get('/', auditController.getAuditLogs);
router.get('/latest-result', auditController.getLatestResult);
router.post('/analysis-result', auditController.receiveAnalysisResult);

// Protected Routes (using apiKeyAuth if configured, or just open if that's the current state of flows)
// For now, mirroring the routes without specific middleware enforcement unless reused from flows
router.post('/analyze', auditController.analyzeAuditLogs);
router.get('/results', auditController.getAllResults);
router.get('/results/:id', auditController.getResultById);
router.delete('/results/:id', auditController.deleteResult);
router.get('/stats', auditController.getStats);
router.post('/trigger-analysis', auditController.triggerAnalysis);

module.exports = router;
