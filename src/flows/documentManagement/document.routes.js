const express = require('express');
const multer = require('multer');
const router = express.Router();
const documentController = require('./document.controller');
const { authSupabase } = require('../../middlewares');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

// Document routes
router.get('/list', authSupabase, documentController.getUserDocuments); // Get user's documents from database
router.get('/stats', authSupabase, documentController.getDashboardStats); // Get dashboard statistics
router.get('/search', authSupabase, documentController.searchDocuments); // Search documents by title or description
router.get('/by-category', authSupabase, documentController.getDocumentsByCategory); // Get documents by category
router.get('/folder-stats', authSupabase, documentController.getFolderStats); // Get folder statistics

// Notification routes - PHẢI ĐẶT TRƯỚC route /:id để tránh bị match nhầm
router.get('/notifications', authSupabase, documentController.getNotifications); // Get user notifications
router.put('/notifications/mark-all-read', authSupabase, documentController.markAllNotificationsAsRead); // Mark all notifications as read

// Upload documents to polling queue (multiple files)
router.post(
  '/upload-to-queue',
  authSupabase,
  upload.array('files'),
  documentController.uploadDocumentsToQueue
);

// Generic routes - PHẢI ĐẶT SAU các specific routes
router.get('/', documentController.getDocuments); // Get documents via n8n
router.get('/:id', documentController.getDocument);
router.post('/', documentController.createDocument);
router.put('/:id', documentController.updateDocument);
router.delete('/:id', authSupabase, documentController.deleteDocument); // Delete document (soft delete - update status)

module.exports = router;
