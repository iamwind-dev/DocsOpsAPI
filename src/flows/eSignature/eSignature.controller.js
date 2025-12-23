/**
 * E-Signature Controller
 * 
 * Controller xử lý tất cả logic cho E-signature module.
 * 
 * Các chức năng chính:
 * 1. Quản lý user signatures (đăng ký, xem)
 * 2. Quản lý signature requests (tạo, xem, cập nhật)
 * 3. Ký tài liệu
 * 4. Xác minh chữ ký
 * 
 * LƯU Ý BẢO MẬT:
 * - PIN được hash bằng SHA256 (demo). Production nên dùng bcrypt/argon2
 * - Secret key là random 32 bytes, không bao giờ expose ra ngoài
 * - HMAC-SHA256 được dùng để tạo signature value
 */

const crypto = require('crypto');
const { supabaseAdmin } = require('../../config/supabase');
const { catchAsync, response, httpStatus, ApiError, n8nClient } = require('../../common');
const config = require('../../config');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Hash PIN bằng SHA256
 * LƯU Ý: Đây chỉ là demo. Production nên dùng bcrypt hoặc argon2
 * vì SHA256 không có salt và dễ bị rainbow table attack
 */
const hashPin = (pin) => {
  return crypto.createHash('sha256').update(pin).digest('hex');
};

/**
 * Tạo random secret key (32 bytes = 256 bits)
 * Dùng cho HMAC signing
 */
const generateSecretKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Tính hash của document
 * TODO: Trong production, nên đọc nội dung file thực từ storage và hash
 * Hiện tại chỉ demo bằng cách hash documentId
 */
const computeDocumentHash = (documentId) => {
  // TODO: Read actual file content from storage and hash it
  // const fileContent = await downloadFile(document.storage_path);
  // return crypto.createHash('sha256').update(fileContent).digest('hex');
  
  return crypto.createHash('sha256').update(`doc-${documentId}`).digest('hex');
};

/**
 * Tạo chữ ký bằng HMAC-SHA256
 * @param {string} documentHash - Hash của document
 * @param {string} secretKey - Secret key của user
 * @returns {string} - Signature value (hex)
 */
const createSignature = (documentHash, secretKey) => {
  return crypto.createHmac('sha256', secretKey).update(documentHash).digest('hex');
};

/**
 * Verify chữ ký
 * @param {string} documentHash - Hash của document
 * @param {string} secretKey - Secret key của user
 * @param {string} signatureValue - Chữ ký cần verify
 * @returns {boolean}
 */
const verifySignature = (documentHash, secretKey, signatureValue) => {
  const expectedSignature = createSignature(documentHash, secretKey);
  // Sử dụng timingSafeEqual để tránh timing attack
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureValue, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
};

/**
 * Ghi audit event
 */
const logAuditEvent = async (actorId, eventType, documentId, details = {}) => {
  try {
    await supabaseAdmin.from('audit_events').insert({
      actor_id: actorId,
      event_type: eventType,
      document_id: documentId,
      details,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Không throw error vì audit log failure không nên block main flow
  }
};

// ============================================
// A. USER SIGNATURE MANAGEMENT
// ============================================

/**
 * POST /signature/register
 * Đăng ký chữ ký mới cho user
 * 
 * Body: { pin: string, label?: string }
 * 
 * Flow:
 * 1. Hash PIN
 * 2. Generate secret key
 * 3. Revoke old signature (nếu có)
 * 4. Tạo signature mới
 */
const registerSignature = catchAsync(async (req, res) => {
  const { pin, label } = req.body;
  const userId = req.user.id;

  // Validate PIN
  if (!pin || typeof pin !== 'string' || pin.length < 4) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PIN must be at least 4 characters');
  }

  // Hash PIN và generate secret key
  const pinHash = hashPin(pin);
  const secretKey = generateSecretKey();

  // Revoke old active signature (set revoked_at = now())
  // Theo constraint: chỉ có 1 active signature per user
  await supabaseAdmin
    .from('user_signatures')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);

  // Tạo signature mới
  const { data: signature, error } = await supabaseAdmin
    .from('user_signatures')
    .insert({
      user_id: userId,
      pin_hash: pinHash,
      secret_key: secretKey,
      label: label || 'Default Signature',
    })
    .select('id, label, created_at')
    .single();

  if (error) {
    console.error('Error creating signature:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to register signature');
  }

  // Log audit event
  await logAuditEvent(userId, 'REGISTER_SIGNATURE', null, {
    signature_id: signature.id,
    label: signature.label,
  });

  return response.created(res, {
    signatureId: signature.id,
    label: signature.label,
    createdAt: signature.created_at,
  }, 'Signature registered successfully');
});

/**
 * GET /signature/me
 * Lấy thông tin signature hiện tại của user
 * Không trả về secret_key và pin_hash
 */
const getMySignature = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const { data: signature, error } = await supabaseAdmin
    .from('user_signatures')
    .select('id, label, created_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching signature:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch signature');
  }

  if (!signature) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No active signature found. Please register one first.');
  }

  return response.success(res, signature, 'Signature retrieved successfully');
});

// ============================================
// B. SIGNATURE REQUESTS MANAGEMENT
// ============================================

/**
 * POST /signature-requests
 * Tạo yêu cầu ký tài liệu mới
 * 
 * Body: {
 *   documentId: uuid,
 *   signers: [{ signerId?, signerEmail, signerName?, orderIndex? }],
 *   message?: string,
 *   expiresAt?: string (ISO)
 * }
 */
const createSignatureRequest = catchAsync(async (req, res) => {
  const { documentId, signers, message, expiresAt } = req.body;
  const creatorId = req.user.id;

  // Validate input
  if (!documentId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'documentId is required');
  }
  if (!signers || !Array.isArray(signers) || signers.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'At least one signer is required');
  }

  // Verify document exists
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id, title, owner_id')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Tạo signature request
  const { data: request, error: requestError } = await supabaseAdmin
    .from('signature_requests')
    .insert({
      document_id: documentId,
      creator_id: creatorId,
      status: 'pending',
      message: message || null,
      expires_at: expiresAt || null,
    })
    .select()
    .single();

  if (requestError) {
    console.error('Error creating signature request:', requestError);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create signature request');
  }

  // Tạo các signer records
  const signerRecords = signers.map((signer, index) => ({
    request_id: request.id,
    signer_id: signer.signerId || null,
    signer_email: signer.signerEmail,
    signer_name: signer.signerName || null,
    order_index: signer.orderIndex || index + 1,
    status: 'pending',
  }));

  const { data: createdSigners, error: signersError } = await supabaseAdmin
    .from('signature_request_signers')
    .insert(signerRecords)
    .select();

  if (signersError) {
    console.error('Error creating signers:', signersError);
    // Rollback: xóa request đã tạo
    await supabaseAdmin.from('signature_requests').delete().eq('id', request.id);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to add signers');
  }

  // Log audit event
  await logAuditEvent(creatorId, 'CREATE_SIGNATURE_REQUEST', documentId, {
    request_id: request.id,
    signers_count: signers.length,
  });

  // Trigger n8n workflow để gửi email (nếu có)
  try {
    await n8nClient.triggerWebhook('e-signature/send-request', {
      requestId: request.id,
    });
  } catch (error) {
    console.error('Failed to trigger n8n workflow:', error);
    // Không throw error vì email notification failure không nên block main flow
  }

  return response.created(res, {
    ...request,
    signers: createdSigners,
    document: { id: document.id, title: document.title },
  }, 'Signature request created successfully');
});

/**
 * GET /signature-requests
 * Lấy danh sách signature requests
 * 
 * Query params:
 * - status: filter theo status
 * - documentId: filter theo document
 * 
 * Trả về requests mà user là creator HOẶC là signer
 */
const getSignatureRequests = catchAsync(async (req, res) => {
  const { status, documentId } = req.query;
  const userId = req.user.id;
  const userEmail = req.user.email;

  // Lấy requests mà user tạo
  let creatorQuery = supabaseAdmin
    .from('signature_requests')
    .select(`
      *,
      document:documents(id, title, storage_path),
      signers:signature_request_signers(*)
    `)
    .eq('creator_id', userId);

  if (status) {
    creatorQuery = creatorQuery.eq('status', status);
  }
  if (documentId) {
    creatorQuery = creatorQuery.eq('document_id', documentId);
  }

  const { data: creatorRequests, error: creatorError } = await creatorQuery;

  if (creatorError) {
    console.error('Error fetching creator requests:', creatorError);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch signature requests');
  }

  // Lấy requests mà user là signer (qua email hoặc signer_id)
  const { data: signerRecords, error: signerError } = await supabaseAdmin
    .from('signature_request_signers')
    .select('request_id')
    .or(`signer_id.eq.${userId},signer_email.eq.${userEmail}`);

  if (signerError) {
    console.error('Error fetching signer records:', signerError);
  }

  let signerRequests = [];
  if (signerRecords && signerRecords.length > 0) {
    const requestIds = [...new Set(signerRecords.map(s => s.request_id))];
    
    let signerQuery = supabaseAdmin
      .from('signature_requests')
      .select(`
        *,
        document:documents(id, title, storage_path),
        signers:signature_request_signers(*)
      `)
      .in('id', requestIds)
      .neq('creator_id', userId); // Loại bỏ requests đã có trong creatorRequests

    if (status) {
      signerQuery = signerQuery.eq('status', status);
    }
    if (documentId) {
      signerQuery = signerQuery.eq('document_id', documentId);
    }

    const { data } = await signerQuery;
    signerRequests = data || [];
  }

  // Merge và sort theo created_at
  const allRequests = [...creatorRequests, ...signerRequests].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return response.success(res, allRequests, 'Signature requests retrieved successfully');
});

/**
 * GET /signature-requests/:id
 * Lấy chi tiết một signature request
 */
const getSignatureRequest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userEmail = req.user.email;

  const { data: request, error } = await supabaseAdmin
    .from('signature_requests')
    .select(`
      *,
      document:documents(*),
      signers:signature_request_signers(*),
      creator:auth.users(id, email)
    `)
    .eq('id', id)
    .single();

  if (error || !request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Signature request not found');
  }

  // Kiểm tra quyền xem: phải là creator hoặc signer
  const isCreator = request.creator_id === userId;
  const isSigner = request.signers.some(
    s => s.signer_id === userId || s.signer_email === userEmail
  );

  if (!isCreator && !isSigner) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to view this request');
  }

  return response.success(res, request, 'Signature request retrieved successfully');
});

/**
 * PUT /signature-requests/:id/status
 * Cập nhật status của signature request
 * Chỉ creator mới có thể cancel
 */
const updateSignatureRequestStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const validStatuses = ['cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid status. Only "cancelled" is allowed.');
  }

  // Kiểm tra request tồn tại và user là creator
  const { data: request, error: fetchError } = await supabaseAdmin
    .from('signature_requests')
    .select('id, creator_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Signature request not found');
  }

  if (request.creator_id !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only the creator can cancel this request');
  }

  if (request.status === 'signed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot cancel a completed request');
  }

  // Update status
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('signature_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update request status');
  }

  // Cập nhật tất cả signers thành cancelled
  await supabaseAdmin
    .from('signature_request_signers')
    .update({ status: 'cancelled' })
    .eq('request_id', id);

  await logAuditEvent(userId, 'CANCEL_SIGNATURE_REQUEST', request.document_id, {
    request_id: id,
  });

  return response.success(res, updated, 'Signature request cancelled successfully');
});

// ============================================
// C. SIGNING DOCUMENTS
// ============================================

/**
 * POST /documents/:documentId/sign
 * Ký một tài liệu
 * 
 * Body: { pin: string, meta?: any, requestId?: uuid }
 * 
 * Flow:
 * 1. Verify user có active signature
 * 2. Verify PIN đúng
 * 3. Compute document hash
 * 4. Tạo signature bằng HMAC
 * 5. Lưu vào document_signatures
 * 6. Nếu có requestId, update signer status
 * 7. Log audit event
 */
const signDocument = catchAsync(async (req, res) => {
  const { documentId } = req.params;
  const { pin, meta, requestId } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;

  // Validate PIN
  if (!pin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PIN is required');
  }

  // Verify document exists
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Lấy active signature của user
  const { data: userSignature, error: sigError } = await supabaseAdmin
    .from('user_signatures')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .single();

  if (sigError || !userSignature) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You need to register a signature first');
  }

  // Verify PIN
  const pinHash = hashPin(pin);
  if (pinHash !== userSignature.pin_hash) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid PIN');
  }

  // Compute document hash
  const documentHash = computeDocumentHash(documentId);

  // Create signature value using HMAC-SHA256
  const signatureValue = createSignature(documentHash, userSignature.secret_key);

  // Prepare meta data
  const signatureMeta = {
    ...meta,
    ip: req.ip,
    user_agent: req.headers['user-agent'],
    signed_at: new Date().toISOString(),
  };

  // Insert document signature
  const { data: docSignature, error: insertError } = await supabaseAdmin
    .from('document_signatures')
    .insert({
      document_id: documentId,
      user_id: userId,
      document_hash: documentHash,
      signature_value: signatureValue,
      meta: signatureMeta,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating document signature:', insertError);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to sign document');
  }

  // Nếu có requestId, update signer status
  if (requestId) {
    // Tìm signer record của user trong request
    const { data: signerRecord, error: signerError } = await supabaseAdmin
      .from('signature_request_signers')
      .select('*')
      .eq('request_id', requestId)
      .or(`signer_id.eq.${userId},signer_email.eq.${userEmail}`)
      .single();

    if (!signerError && signerRecord) {
      // Update signer status
      await supabaseAdmin
        .from('signature_request_signers')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_id: docSignature.id,
        })
        .eq('id', signerRecord.id);

      // Kiểm tra xem tất cả signers đã ký chưa
      const { data: allSigners } = await supabaseAdmin
        .from('signature_request_signers')
        .select('status')
        .eq('request_id', requestId);

      const allSigned = allSigners?.every(s => s.status === 'signed');

      if (allSigned) {
        // Update request status to 'signed'
        await supabaseAdmin
          .from('signature_requests')
          .update({ status: 'signed', updated_at: new Date().toISOString() })
          .eq('id', requestId);

        // Update document status to 'signed'
        await supabaseAdmin
          .from('documents')
          .update({ status: 'signed', update_at: new Date().toISOString() })
          .eq('id', documentId);
      }
    }
  }

  // Log audit event
  await logAuditEvent(userId, 'SIGN_DOCUMENT', documentId, {
    signature_id: docSignature.id,
    request_id: requestId || null,
  });

  return response.success(res, {
    id: docSignature.id,
    documentId: docSignature.document_id,
    documentHash: docSignature.document_hash,
    createdAt: docSignature.created_at,
  }, 'Document signed successfully');
});

/**
 * GET /documents/:documentId/signatures
 * Lấy tất cả signatures của một document
 */
const getDocumentSignatures = catchAsync(async (req, res) => {
  const { documentId } = req.params;

  // Verify document exists
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id, title, owner_id')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Lấy tất cả signatures
  const { data: signatures, error } = await supabaseAdmin
    .from('document_signatures')
    .select(`
      id,
      document_hash,
      created_at,
      meta,
      user:auth.users(id, email)
    `)
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching signatures:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch signatures');
  }

  return response.success(res, {
    document: { id: document.id, title: document.title },
    signatures: signatures || [],
  }, 'Document signatures retrieved successfully');
});

// ============================================
// D. VERIFICATION
// ============================================

/**
 * GET /documents/:documentId/signatures/:signatureId/verify
 * Verify một chữ ký có hợp lệ không
 * 
 * Flow:
 * 1. Fetch signature record
 * 2. Fetch user's secret key
 * 3. Recompute HMAC
 * 4. Compare với stored signature value
 */
const verifyDocumentSignature = catchAsync(async (req, res) => {
  const { documentId, signatureId } = req.params;

  // Fetch signature
  const { data: signature, error: sigError } = await supabaseAdmin
    .from('document_signatures')
    .select('*')
    .eq('id', signatureId)
    .eq('document_id', documentId)
    .single();

  if (sigError || !signature) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Signature not found');
  }

  // Fetch user's current active signature (secret key)
  // LƯU Ý: Trong production, có thể cần lưu secret_key snapshot tại thời điểm ký
  // để verify ngay cả khi user đã revoke signature cũ
  const { data: userSignature, error: userSigError } = await supabaseAdmin
    .from('user_signatures')
    .select('secret_key')
    .eq('user_id', signature.user_id)
    .is('revoked_at', null)
    .single();

  if (userSigError || !userSignature) {
    return response.success(res, {
      valid: false,
      signature: {
        id: signature.id,
        documentHash: signature.document_hash,
        createdAt: signature.created_at,
      },
      reason: 'Signer has no active signature. The original signing key may have been revoked.',
    }, 'Signature verification completed');
  }

  // Verify signature
  const isValid = verifySignature(
    signature.document_hash,
    userSignature.secret_key,
    signature.signature_value
  );

  // Log verification attempt
  await logAuditEvent(req.user?.id || null, 'VERIFY_SIGNATURE', documentId, {
    signature_id: signatureId,
    is_valid: isValid,
  });

  return response.success(res, {
    valid: isValid,
    signature: {
      id: signature.id,
      documentHash: signature.document_hash,
      createdAt: signature.created_at,
      signedBy: signature.user_id,
    },
    reason: isValid ? 'Signature is valid' : 'Signature verification failed. Document may have been tampered.',
  }, 'Signature verification completed');
});

// ============================================
// INTERNAL ENDPOINTS (for n8n)
// ============================================

/**
 * GET /internal/pending-signers
 * Lấy danh sách signers chưa ký (cho n8n reminder workflow)
 * 
 * Query params:
 * - days: số ngày tính từ khi tạo request (default: 2)
 */
const getPendingSigners = catchAsync(async (req, res) => {
  const days = parseInt(req.query.days) || 2;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data: pendingSigners, error } = await supabaseAdmin
    .from('signature_request_signers')
    .select(`
      *,
      request:signature_requests(
        id,
        message,
        expires_at,
        created_at,
        document:documents(id, title)
      )
    `)
    .eq('status', 'pending')
    .lt('request.created_at', cutoffDate.toISOString());

  if (error) {
    console.error('Error fetching pending signers:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch pending signers');
  }

  // Filter out null requests (from join)
  const validSigners = (pendingSigners || []).filter(s => s.request);

  return response.success(res, validSigners, 'Pending signers retrieved successfully');
});

/**
 * POST /signature-requests/:id/provider-info
 * Lưu thông tin từ external e-sign provider (cho n8n workflow)
 */
const saveProviderInfo = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { providerEnvelopeId, providerSigningUrl, providerData } = req.body;

  const { data: request, error: fetchError } = await supabaseAdmin
    .from('signature_requests')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError || !request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Signature request not found');
  }

  // Lưu provider info vào một field JSON hoặc table riêng
  // Ở đây ta sử dụng message field tạm thời (trong production nên có table riêng)
  const { error: updateError } = await supabaseAdmin
    .from('signature_requests')
    .update({
      message: JSON.stringify({
        provider_envelope_id: providerEnvelopeId,
        provider_signing_url: providerSigningUrl,
        provider_data: providerData,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to save provider info');
  }

  return response.success(res, { requestId: id }, 'Provider info saved successfully');
});

/**
 * POST /provider/signed-file
 * Nhận file đã ký từ external provider (cho n8n callback)
 */
const receiveSignedFile = catchAsync(async (req, res) => {
  const { providerEnvelopeId, documentId, signedFileUrl } = req.body;

  // Tìm signature request theo provider envelope id
  // (Trong production, cần có bảng riêng để map envelope_id -> request_id)
  
  // Update document status
  const { error: updateError } = await supabaseAdmin
    .from('documents')
    .update({ 
      status: 'signed',
      update_at: new Date().toISOString(),
      // Có thể lưu signed file URL vào storage_path hoặc field riêng
    })
    .eq('id', documentId);

  if (updateError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update document');
  }

  // Log audit event
  await logAuditEvent(null, 'PROVIDER_SIGNED', documentId, {
    provider_envelope_id: providerEnvelopeId,
    signed_file_url: signedFileUrl,
  });

  return response.success(res, { documentId }, 'Signed file received successfully');
});

/**
 * GET /internal/signature-requests/:id
 * Lấy chi tiết signature request cho n8n (không cần user auth)
 * Dùng API key authentication
 */
const getSignatureRequestInternal = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { data: request, error } = await supabaseAdmin
    .from('signature_requests')
    .select(`
      *,
      document:documents(*),
      signers:signature_request_signers(*)
    `)
    .eq('id', id)
    .single();

  if (error || !request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Signature request not found');
  }

  return response.success(res, request, 'Signature request retrieved successfully');
});

/**
 * PUT /internal/signature-requests/:id/status
 * Cập nhật status của signature request (cho n8n workflow)
 * Dùng API key authentication - không cần user permission check
 */
const updateSignatureRequestStatusInternal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'sent', 'signed', 'cancelled', 'expired'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid status. Allowed: ${validStatuses.join(', ')}`);
  }

  // Kiểm tra request tồn tại
  const { data: request, error: fetchError } = await supabaseAdmin
    .from('signature_requests')
    .select('id, status, document_id')
    .eq('id', id)
    .single();

  if (fetchError || !request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Signature request not found');
  }

  // Update status
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('signature_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update request status');
  }

  await logAuditEvent(null, 'UPDATE_REQUEST_STATUS', request.document_id, {
    request_id: id,
    new_status: status,
  });

  return response.success(res, updated, `Request status updated to ${status}`);
});

module.exports = {
  // User signature management
  registerSignature,
  getMySignature,
  
  // Signature requests
  createSignatureRequest,
  getSignatureRequests,
  getSignatureRequest,
  updateSignatureRequestStatus,
  
  // Signing documents
  signDocument,
  getDocumentSignatures,
  
  // Verification
  verifyDocumentSignature,
  
  // Internal/n8n endpoints
  getPendingSigners,
  saveProviderInfo,
  receiveSignedFile,
  getSignatureRequestInternal,
  updateSignatureRequestStatusInternal,
};
