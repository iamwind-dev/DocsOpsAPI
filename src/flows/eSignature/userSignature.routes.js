/**
 * User Signature Routes
 * 
 * Workflow 17: User Signature Creation & Management
 * Định nghĩa routes cho quản lý chữ ký điện tử
 * 
 * Base URL: /api/v1/e-signature-ext/user-signature
 * 
 * KHÔNG ảnh hưởng routes hiện tại - module độc lập
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const userSignatureController = require('./userSignature.controller');
const { authSupabase } = require('../../middlewares/authSupabase');
const { apiKeyAuth } = require('../../middlewares');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB for signatures
});

// Configure multer for PDF files (larger limit)
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB for PDFs
});

// ============================================
// PUBLIC ENDPOINTS (User Auth - Supabase JWT)
// ============================================

/**
 * POST /create
 * Tạo chữ ký mới từ frontend
 * FormData: { signatureImage: File, pin: string, signatureType: string, label?: string, isDefault?: boolean }
 */
router.post('/create', authSupabase, upload.single('signatureImage'), userSignatureController.createUserSignatureFromFrontend);

/**
 * GET /my-signatures
 * Lấy danh sách chữ ký của user hiện tại
 */
router.get('/my-signatures', authSupabase, userSignatureController.getMySignatures);

/**
 * GET /default
 * Lấy chữ ký mặc định
 */
router.get('/default', authSupabase, userSignatureController.getMyDefaultSignature);

/**
 * DELETE /my-signatures/:id
 * Xóa chữ ký
 */
router.delete('/my-signatures/:id', authSupabase, userSignatureController.deleteMySignature);

/**
 * PUT /my-signatures/:id/set-default
 * Set làm chữ ký mặc định
 */
router.put('/my-signatures/:id/set-default', authSupabase, userSignatureController.setDefaultSignature);

/**
 * POST /verify-pin
 * Xác thực PIN
 * Body: { pin: string }
 */
router.post('/verify-pin', authSupabase, userSignatureController.verifyPin);

/**
 * PUT /update-pin
 * Cập nhật PIN
 * Body: { currentPin: string, newPin: string }
 */
router.put('/update-pin', authSupabase, userSignatureController.updatePin);

/**
 * POST /force-rehash-pin
 * Re-hash PIN để fix lỗi trim (temporary fix)
 * Body: { pin: string }
 */
router.post('/force-rehash-pin', authSupabase, userSignatureController.forceRehashPin);

/**
 * POST /insert-signature-to-pdf
 * Chèn chữ ký vào file PDF
 * FormData: { 
 *   pdfFile: File,
 *   signatureId: UUID,
 *   pageNumber: number,
 *   position: string,
 *   x?: number,
 *   y?: number,
 *   width: number,
 *   height: number
 * }
 */
router.post('/insert-signature-to-pdf', authSupabase, uploadPdf.single('pdfFile'), userSignatureController.insertSignatureToPdf);

// ============================================
// INTERNAL ENDPOINTS (API Key Auth - cho n8n)
// ============================================

/**
 * POST /internal/create
 * Tạo chữ ký từ n8n workflow
 * Body: { userId, signatureImage, pinHash, signatureType }
 */
router.post('/internal/create', apiKeyAuth, userSignatureController.createUserSignature);

/**
 * POST /internal/create-with-pin
 * Tạo chữ ký từ n8n workflow với plain PIN (sẽ hash ở backend)
 * Body: { userId, userEmail, signatureImage, pin, signatureType, label, isDefault }
 */
router.post('/internal/create-with-pin', apiKeyAuth, userSignatureController.createUserSignatureWithPin);

module.exports = router;
