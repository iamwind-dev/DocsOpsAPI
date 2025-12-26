const express = require('express');
const router = express.Router();
const multer = require('multer');

// Middleware
const { checkBlockStatus, authSupabase } = require('../../middlewares');
const documentController = require('../../flows/documentManagement/document.controller');

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Route: /api/v2/documents/upload
// Note: audit-tracking-main checks block status.
// It also might expect userId in body.
// uploadDocumentSmart in api looks for req.user or req.body.userId.
router.post(
  '/upload',
  upload.single('file'),
  checkBlockStatus,
  documentController.uploadDocumentSmart
);

// Route: /api/v2/documents/request-download
router.post(
  '/request-download',
  checkBlockStatus,
  documentController.requestDownloadUrl
);

module.exports = router;
