const express = require('express');
const router = express.Router();

const {
  documentRoutes,
  classificationRoutes,
  eSignatureRoutes,
  auditRoutes,
  archiveRoutes,
} = require('../flows');

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/documents', documentRoutes);
router.use('/classification', classificationRoutes);
router.use('/e-signature', eSignatureRoutes);
router.use('/audit', auditRoutes);
router.use('/archives', archiveRoutes);

module.exports = router;
