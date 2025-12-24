/**
 * E-Signature Extension Routes
 * 
 * Định nghĩa routes cho các endpoints mới.
 * Base prefix: /api/v1/e-signature-ext
 * 
 * KHÔNG sửa đổi routes gốc - hoàn toàn độc lập.
 */

const express = require('express');
const router = express.Router();
const extController = require('./eSignatureExtension.controller');
const { authSupabase } = require('../../middlewares/authSupabase');
const { apiKeyAuth } = require('../../middlewares');

// ============================================
// A. SIGNATURE PLACEHOLDERS (User Auth)
// ============================================

/**
 * POST /placeholders
 * Tạo signature placeholder mới
 * Body: { requestId, signerId?, pageNumber, x, y, width?, height?, type?, required? }
 */
router.post('/placeholders', authSupabase, extController.createPlaceholder);

/**
 * GET /placeholders/:requestId
 * Lấy danh sách placeholders của request
 */
router.get('/placeholders/:requestId', authSupabase, extController.getPlaceholders);

/**
 * DELETE /placeholders/:id
 * Xóa placeholder
 */
router.delete('/placeholders/:id', authSupabase, extController.deletePlaceholder);

// ============================================
// B. PDF PROCESSING (User Auth)
// ============================================

/**
 * POST /documents/:id/apply-signature
 * Apply signature image lên PDF
 * Body: { signatureImage?, signatureData?, position: { page, x, y, width?, height? } }
 */
router.post('/documents/:id/apply-signature', authSupabase, extController.applySignatureToPdf);

/**
 * GET /documents/:id/thumbnail
 * Get document thumbnail
 */
router.get('/documents/:id/thumbnail', authSupabase, extController.getDocumentThumbnail);

// ============================================
// C. INTERNAL ENDPOINTS (API Key Auth - for n8n)
// ============================================

/**
 * POST /internal/expire-requests
 * Mark expired requests
 */
router.post('/internal/expire-requests', apiKeyAuth, extController.expireRequests);

/**
 * GET /internal/expiring-requests
 * Get requests that are expired but not yet marked
 */
router.get('/internal/expiring-requests', apiKeyAuth, extController.getExpiringRequests);

/**
 * POST /internal/archive-document
 * Archive a signed document
 * Body: { documentId, requestId }
 */
router.post('/internal/archive-document', apiKeyAuth, extController.archiveDocument);

/**
 * POST /internal/log-session
 * Log signing session for fraud detection
 * Body: { signerId, ipAddress, userAgent, deviceFingerprint }
 */
router.post('/internal/log-session', apiKeyAuth, extController.logSigningSession);

/**
 * POST /internal/check-fraud
 * Check for suspicious signing patterns
 * Body: { sessionId, signerId, signedAt }
 */
router.post('/internal/check-fraud', apiKeyAuth, extController.checkFraud);

/**
 * GET /internal/suspicious-sessions
 * Get all suspicious signing sessions
 */
router.get('/internal/suspicious-sessions', apiKeyAuth, extController.getSuspiciousSessions);

/**
 * POST /internal/generate-certificate
 * Generate Certificate of Completion
 * Body: { requestId }
 */
router.post('/internal/generate-certificate', apiKeyAuth, extController.generateCertificate);

/**
 * GET /internal/reminder-status/:signerId
 * Check reminder level for signer
 */
router.get('/internal/reminder-status/:signerId', apiKeyAuth, extController.getReminderStatus);

/**
 * POST /internal/record-reminder
 * Record reminder sent
 * Body: { signerId, level }
 */
router.post('/internal/record-reminder', apiKeyAuth, extController.recordReminder);

/**
 * POST /internal/broadcast-event
 * Broadcast event via WebSocket
 * Body: { requestId?, eventType, data }
 */
router.post('/internal/broadcast-event', apiKeyAuth, extController.broadcastEvent);

/**
 * POST /internal/process-document
 * Process uploaded document
 * Body: { documentId }
 */
router.post('/internal/process-document', apiKeyAuth, extController.processDocument);

/**
 * POST /internal/watermark
 * Update document watermark
 * Body: { text?, type: 'pending'|'completed'|'draft' }
 */
router.post('/documents/:id/watermark', apiKeyAuth, extController.updateWatermark);

/**
 * POST /internal/notifications
 * Create notification record
 * Body: { recipientId?, recipientEmail, channel, eventType, subject, content, metadata? }
 */
router.post('/internal/notifications', apiKeyAuth, extController.createNotification);

/**
 * PUT /internal/notifications/:id/status
 * Update notification status
 * Body: { status, errorMessage? }
 */
router.put('/internal/notifications/:id/status', apiKeyAuth, extController.updateNotificationStatus);

/**
 * GET /internal/failed-notifications
 * Get failed notifications for retry
 */
router.get('/internal/failed-notifications', apiKeyAuth, extController.getFailedNotifications);

// ============================================
// E. AI SIGNATURE DETECTION (Workflow 18)
// ============================================

/**
 * POST /internal/get-document-data
 * Get document data for AI processing
 * Body: { documentId }
 */
router.post('/internal/get-document-data', apiKeyAuth, extController.getDocumentData);

/**
 * POST /internal/convert-to-images
 * Convert PDF to images for AI analysis
 * Body: { documentPath }
 */
router.post('/internal/convert-to-images', apiKeyAuth, extController.convertPdfToImages);

/**
 * POST /internal/extract-text
 * Extract text from PDF for AI text analysis
 * Body: { documentPath }
 */
router.post('/internal/extract-text', apiKeyAuth, extController.extractPdfText);

/**
 * POST /internal/create-test-request
 * Create test signature request for AI workflow (bypass RLS)
 * Body: { fileName, fileType, fileSize, userId, title }
 */
router.post('/internal/create-test-request', apiKeyAuth, extController.createTestRequest);

/**
 * POST /internal/apply-default-signatures
 * Apply default signatures at detected positions
 * Body: { documentId, signaturePositions: [{ page, x, y, width, height, type, signer, reason }], useDefaultSignature }
 */
router.post('/internal/apply-default-signatures', apiKeyAuth, extController.applyDefaultSignatures);

// ============================================
// D. USER SIGNATURE MANAGEMENT (Workflow 17)
// ============================================

/**
 * Mount user-signature routes
 * Base: /api/v1/e-signature-ext/user-signature
 */
const userSignatureRoutes = require('./userSignature.routes');
router.use('/user-signature', userSignatureRoutes);

module.exports = router;
