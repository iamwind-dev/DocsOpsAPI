const express = require('express');
const router = express.Router();

const {
  documentRoutes,
  classificationRoutes,
  eSignatureRoutes,
  eSignatureExtensionRoutes,
  auditRoutes,
  archiveRoutes,
  authRoutes,
  departmentRoutes,
  userRoutes,
  adminRoutes,
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
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/documents', documentRoutes);
router.use('/classification', classificationRoutes);
router.use('/e-signature', eSignatureRoutes);
router.use('/e-signature-ext', eSignatureExtensionRoutes);
router.use('/audit', auditRoutes);
router.use('/archives', archiveRoutes);
router.use('/department-configs', departmentRoutes);


module.exports = router;
