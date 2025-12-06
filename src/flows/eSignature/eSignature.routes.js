/**
 * E-Signature Routes
 * 
 * Định nghĩa tất cả routes cho E-signature module.
 * Base prefix: /api/e-signature
 * 
 * Tất cả routes yêu cầu authentication (trừ một số internal endpoints)
 */

const express = require('express');
const router = express.Router();
const eSignatureController = require('./eSignature.controller');
const { authSupabase } = require('../../middlewares/authSupabase');

// ============================================
// A. USER SIGNATURE MANAGEMENT
// ============================================

/**
 * POST /signature/register
 * Đăng ký chữ ký mới cho user
 * Body: { pin: string, label?: string }
 */
router.post('/signature/register', authSupabase, eSignatureController.registerSignature);

/**
 * GET /signature/me
 * Lấy thông tin signature hiện tại của user
 */
router.get('/signature/me', authSupabase, eSignatureController.getMySignature);

// ============================================
// B. SIGNATURE REQUESTS
// ============================================

/**
 * POST /signature-requests
 * Tạo yêu cầu ký tài liệu mới
 * Body: {
 *   documentId: uuid,
 *   signers: [{ signerId?, signerEmail, signerName?, orderIndex? }],
 *   message?: string,
 *   expiresAt?: string (ISO)
 * }
 */
router.post('/signature-requests', authSupabase, eSignatureController.createSignatureRequest);

/**
 * GET /signature-requests
 * Lấy danh sách signature requests
 * Query: { status?, documentId? }
 */
router.get('/signature-requests', authSupabase, eSignatureController.getSignatureRequests);

/**
 * GET /signature-requests/:id
 * Lấy chi tiết một signature request
 */
router.get('/signature-requests/:id', authSupabase, eSignatureController.getSignatureRequest);

/**
 * PUT /signature-requests/:id/status
 * Cập nhật status của signature request (cancel)
 * Body: { status: 'cancelled' }
 */
router.put('/signature-requests/:id/status', authSupabase, eSignatureController.updateSignatureRequestStatus);

// ============================================
// C. SIGNING DOCUMENTS
// ============================================

/**
 * POST /documents/:documentId/sign
 * Ký một tài liệu
 * Body: { pin: string, meta?: any, requestId?: uuid }
 */
router.post('/documents/:documentId/sign', authSupabase, eSignatureController.signDocument);

/**
 * GET /documents/:documentId/signatures
 * Lấy tất cả signatures của một document
 */
router.get('/documents/:documentId/signatures', authSupabase, eSignatureController.getDocumentSignatures);

// ============================================
// D. VERIFICATION
// ============================================

/**
 * GET /documents/:documentId/signatures/:signatureId/verify
 * Verify một chữ ký có hợp lệ không
 */
router.get(
  '/documents/:documentId/signatures/:signatureId/verify',
  authSupabase,
  eSignatureController.verifyDocumentSignature
);

// ============================================
// INTERNAL ENDPOINTS (for n8n)
// Những endpoints này nên được bảo vệ bằng API key thay vì user auth
// ============================================

const { apiKeyAuth } = require('../../middlewares');

/**
 * GET /internal/signature-requests/:id
 * Lấy chi tiết một signature request (cho n8n workflow)
 */
router.get('/internal/signature-requests/:id', apiKeyAuth, eSignatureController.getSignatureRequestInternal);

/**
 * PUT /internal/signature-requests/:id/status
 * Cập nhật status của signature request (cho n8n workflow)
 * Body: { status: 'pending' | 'sent' | 'signed' | 'cancelled' | 'expired' }
 */
router.put('/internal/signature-requests/:id/status', apiKeyAuth, eSignatureController.updateSignatureRequestStatusInternal);

/**
 * GET /internal/pending-signers
 * Lấy danh sách signers chưa ký (cho n8n reminder workflow)
 * Query: { days?: number } - số ngày tính từ khi tạo request
 */
router.get('/internal/pending-signers', apiKeyAuth, eSignatureController.getPendingSigners);

/**
 * POST /signature-requests/:id/provider-info
 * Lưu thông tin từ external e-sign provider
 * Body: { providerEnvelopeId, providerSigningUrl, providerData }
 */
router.post('/signature-requests/:id/provider-info', apiKeyAuth, eSignatureController.saveProviderInfo);

/**
 * POST /provider/signed-file
 * Nhận file đã ký từ external provider
 * Body: { providerEnvelopeId, documentId, signedFileUrl }
 */
router.post('/provider/signed-file', apiKeyAuth, eSignatureController.receiveSignedFile);

module.exports = router;
