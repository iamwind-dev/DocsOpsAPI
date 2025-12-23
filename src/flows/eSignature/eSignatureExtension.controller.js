/**
 * E-Signature Extension Controller
 * 
 * Bổ sung các endpoints mới cho hệ thống E-Signature.
 * KHÔNG sửa đổi controller gốc - hoàn toàn độc lập.
 * 
 * Chức năng mới:
 * - Signature placeholders management
 * - PDF processing (watermark, apply signature)
 * - Document archiving
 * - Fraud detection sessions
 * - Certificate generation
 * - Smart reminder tracking
 * - WebSocket event broadcasting
 */

const { supabaseAdmin } = require('../../config/supabase');
const { catchAsync, response, httpStatus, ApiError } = require('../../common');
const pdfUtils = require('../../common/pdfUtils');
const websocketServer = require('../../common/websocketServer');

// ============================================
// A. SIGNATURE PLACEHOLDERS
// ============================================

/**
 * POST /placeholders
 * Tạo signature placeholder mới
 */
const createPlaceholder = catchAsync(async (req, res) => {
  const { requestId, signerId, pageNumber, x, y, width, height, type, required } = req.body;
  const userId = req.user.id;

  // Verify request exists and user is creator
  const { data: request, error: requestError } = await supabaseAdmin
    .from('signature_requests')
    .select('id, creator_id')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Signature request not found');
  }

  if (request.creator_id !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only request creator can add placeholders');
  }

  // Create placeholder
  const { data: placeholder, error } = await supabaseAdmin
    .from('signature_placeholders')
    .insert({
      request_id: requestId,
      signer_id: signerId || null,
      page_number: pageNumber || 1,
      x_position: x,
      y_position: y,
      width: width || 200,
      height: height || 50,
      placeholder_type: type || 'signature',
      required: required !== false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating placeholder:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create placeholder');
  }

  return response.created(res, placeholder, 'Placeholder created successfully');
});

/**
 * GET /placeholders/:requestId
 * Lấy placeholders của request
 */
const getPlaceholders = catchAsync(async (req, res) => {
  const { requestId } = req.params;

  const { data: placeholders, error } = await supabaseAdmin
    .from('signature_placeholders')
    .select('*, signer:signature_request_signers(id, signer_email, signer_name)')
    .eq('request_id', requestId)
    .order('page_number', { ascending: true });

  if (error) {
    console.error('Error fetching placeholders:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch placeholders');
  }

  return response.success(res, placeholders || [], 'Placeholders retrieved successfully');
});

/**
 * DELETE /placeholders/:id
 * Xóa placeholder
 */
const deletePlaceholder = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify user is creator of the request
  const { data: placeholder, error: fetchError } = await supabaseAdmin
    .from('signature_placeholders')
    .select('id, request:signature_requests(creator_id)')
    .eq('id', id)
    .single();

  if (fetchError || !placeholder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Placeholder not found');
  }

  if (placeholder.request?.creator_id !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only request creator can delete placeholders');
  }

  await supabaseAdmin.from('signature_placeholders').delete().eq('id', id);

  return response.success(res, { id }, 'Placeholder deleted successfully');
});

// ============================================
// B. PDF PROCESSING
// ============================================

/**
 * POST /documents/:id/apply-signature
 * Apply signature image lên PDF
 */
const applySignatureToPdf = catchAsync(async (req, res) => {
  const { id: documentId } = req.params;
  const { signatureImage, position, signatureData } = req.body;
  const userId = req.user.id;

  // Get document
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Download PDF from storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(document.storage_path);

  if (downloadError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to download document');
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

  // Apply signature
  let signedPdfBuffer;
  if (signatureImage) {
    signedPdfBuffer = await pdfUtils.applySignatureImage(pdfBuffer, signatureImage, position);
  } else if (signatureData) {
    signedPdfBuffer = await pdfUtils.applyTextSignature(pdfBuffer, signatureData, position);
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'signatureImage or signatureData required');
  }

  // Upload signed PDF (new version)
  const signedPath = document.storage_path.replace('.pdf', '_signed.pdf');
  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(signedPath, signedPdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload signed document');
  }

  return response.success(res, {
    documentId,
    signedPath,
    originalPath: document.storage_path,
  }, 'Signature applied successfully');
});

/**
 * POST /documents/:id/watermark (Internal)
 * Thêm/đổi watermark
 */
const updateWatermark = catchAsync(async (req, res) => {
  const { id: documentId } = req.params;
  const { text, type } = req.body; // type: 'pending' | 'completed' | 'draft'

  // Get document
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Download PDF
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(document.storage_path);

  if (downloadError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to download document');
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

  // Add watermark
  const watermarkText = text || (type === 'completed' ? 'COMPLETED' : 'PENDING SIGNATURE');
  const watermarkedBuffer = await pdfUtils.addWatermark(pdfBuffer, watermarkText, type || 'pending');

  // Upload watermarked version
  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(document.storage_path, watermarkedBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload watermarked document');
  }

  // Update metadata
  await supabaseAdmin
    .from('document_metadata')
    .upsert({
      document_id: documentId,
      watermark_status: type || 'pending',
    }, { onConflict: 'document_id' });

  return response.success(res, { documentId, watermarkType: type }, 'Watermark updated');
});

/**
 * GET /documents/:id/thumbnail
 * Get document thumbnail (placeholder implementation)
 */
const getDocumentThumbnail = catchAsync(async (req, res) => {
  const { id: documentId } = req.params;

  // Check if thumbnail exists in metadata
  const { data: metadata } = await supabaseAdmin
    .from('document_metadata')
    .select('thumbnail_path')
    .eq('document_id', documentId)
    .single();

  if (metadata?.thumbnail_path) {
    const { data: publicUrl } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(metadata.thumbnail_path);

    return response.success(res, { thumbnailUrl: publicUrl.publicUrl }, 'Thumbnail retrieved');
  }

  // No thumbnail available
  return response.success(res, { thumbnailUrl: null }, 'No thumbnail available');
});

// ============================================
// C. INTERNAL ENDPOINTS (for n8n)
// ============================================

/**
 * POST /internal/expire-requests
 * Mark expired requests
 */
const expireRequests = catchAsync(async (req, res) => {
  const now = new Date().toISOString();

  // Find expired requests
  const { data: expiredRequests, error: fetchError } = await supabaseAdmin
    .from('signature_requests')
    .select('id, document_id')
    .eq('status', 'sent')
    .lt('expires_at', now);

  if (fetchError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch expired requests');
  }

  if (!expiredRequests || expiredRequests.length === 0) {
    return response.success(res, { expiredCount: 0 }, 'No expired requests found');
  }

  // Update status to expired
  const requestIds = expiredRequests.map(r => r.id);
  await supabaseAdmin
    .from('signature_requests')
    .update({ status: 'expired', updated_at: now })
    .in('id', requestIds);

  // Update signers
  await supabaseAdmin
    .from('signature_request_signers')
    .update({ status: 'expired' })
    .in('request_id', requestIds)
    .eq('status', 'pending');

  // Log audit events
  for (const request of expiredRequests) {
    await supabaseAdmin.from('audit_events').insert({
      event_type: 'REQUEST_EXPIRED',
      document_id: request.document_id,
      details: { request_id: request.id, expired_at: now },
    });
  }

  return response.success(res, {
    expiredCount: expiredRequests.length,
    requestIds,
  }, 'Requests marked as expired');
});

/**
 * GET /internal/expiring-requests
 * Get requests that are about to expire or already expired
 */
const getExpiringRequests = catchAsync(async (req, res) => {
  const now = new Date().toISOString();

  const { data: requests, error } = await supabaseAdmin
    .from('signature_requests')
    .select(`
      id, document_id, expires_at, created_at, message,
      document:documents(id, title, owner_id),
      signers:signature_request_signers(id, signer_email, signer_name, status)
    `)
    .in('status', ['pending', 'sent'])
    .lt('expires_at', now);

  if (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch expiring requests');
  }

  return response.success(res, requests || [], 'Expiring requests retrieved');
});

/**
 * POST /internal/archive-document
 * Archive a signed document
 */
const archiveDocument = catchAsync(async (req, res) => {
  const { documentId, requestId } = req.body;

  // Get document
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Create archive path
  const archivePath = `archive/${new Date().getFullYear()}/${documentId}/${document.storage_path.split('/').pop()}`;

  // Copy to archive location
  const { error: copyError } = await supabaseAdmin.storage
    .from('documents')
    .copy(document.storage_path, archivePath);

  if (copyError) {
    console.error('Archive copy error:', copyError);
    // Continue even if copy fails - update metadata anyway
  }

  // Update document status
  await supabaseAdmin
    .from('documents')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', documentId);

  // Update metadata
  await supabaseAdmin
    .from('document_metadata')
    .upsert({
      document_id: documentId,
      archived_at: new Date().toISOString(),
      archive_path: archivePath,
    }, { onConflict: 'document_id' });

  // Log audit
  await supabaseAdmin.from('audit_events').insert({
    event_type: 'DOCUMENT_ARCHIVED',
    document_id: documentId,
    details: { request_id: requestId, archive_path: archivePath },
  });

  return response.success(res, { documentId, archivePath }, 'Document archived');
});

/**
 * POST /internal/log-session
 * Log signing session for fraud detection
 */
const logSigningSession = catchAsync(async (req, res) => {
  const { signerId, ipAddress, userAgent, deviceFingerprint } = req.body;

  const { data: session, error } = await supabaseAdmin
    .from('signing_sessions')
    .insert({
      signer_id: signerId,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_fingerprint: deviceFingerprint,
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to log session');
  }

  return response.created(res, session, 'Session logged');
});

/**
 * POST /internal/check-fraud
 * Check for suspicious signing patterns
 */
const checkFraud = catchAsync(async (req, res) => {
  const { sessionId, signerId, signedAt } = req.body;

  // Get session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('signing_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Session not found');
  }

  const suspicionReasons = [];

  // Check 1: Too fast signing (< 10 seconds)
  const startedAt = new Date(session.started_at);
  const signedAtDate = new Date(signedAt);
  const durationSeconds = (signedAtDate - startedAt) / 1000;

  if (durationSeconds < 10) {
    suspicionReasons.push('SIGNED_TOO_FAST');
  }

  // Check 2: Get previous sessions for this signer
  const { data: previousSessions } = await supabaseAdmin
    .from('signing_sessions')
    .select('ip_address, device_fingerprint')
    .eq('signer_id', signerId)
    .neq('id', sessionId)
    .order('started_at', { ascending: false })
    .limit(5);

  if (previousSessions && previousSessions.length > 0) {
    const lastSession = previousSessions[0];
    
    // Check IP change
    if (lastSession.ip_address && lastSession.ip_address !== session.ip_address) {
      suspicionReasons.push('IP_ADDRESS_CHANGED');
    }

    // Check device change
    if (lastSession.device_fingerprint && lastSession.device_fingerprint !== session.device_fingerprint) {
      suspicionReasons.push('DEVICE_CHANGED');
    }
  }

  const isSuspicious = suspicionReasons.length > 0;

  // Update session
  await supabaseAdmin
    .from('signing_sessions')
    .update({
      signed_at: signedAt,
      duration_seconds: Math.round(durationSeconds),
      is_suspicious: isSuspicious,
      suspicion_reasons: suspicionReasons,
    })
    .eq('id', sessionId);

  return response.success(res, {
    sessionId,
    isSuspicious,
    suspicionReasons,
    durationSeconds: Math.round(durationSeconds),
  }, 'Fraud check completed');
});

/**
 * GET /internal/suspicious-sessions
 * Get suspicious signing sessions
 */
const getSuspiciousSessions = catchAsync(async (req, res) => {
  const { data: sessions, error } = await supabaseAdmin
    .from('signing_sessions')
    .select(`
      *,
      signer:signature_request_signers(
        id, signer_email, signer_name,
        request:signature_requests(id, document:documents(id, title))
      )
    `)
    .eq('is_suspicious', true)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch suspicious sessions');
  }

  return response.success(res, sessions || [], 'Suspicious sessions retrieved');
});

/**
 * POST /internal/generate-certificate
 * Generate Certificate of Completion
 */
const generateCertificate = catchAsync(async (req, res) => {
  const { requestId } = req.body;

  // Get request with all details
  const { data: request, error: requestError } = await supabaseAdmin
    .from('signature_requests')
    .select(`
      id, created_at, updated_at,
      document:documents(id, title, storage_path),
      signers:signature_request_signers(
        id, signer_email, signer_name, signed_at,
        signature:document_signatures(meta)
      )
    `)
    .eq('id', requestId)
    .eq('status', 'signed')
    .single();

  if (requestError || !request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Signed request not found');
  }

  // Get document hash
  let documentHash = null;
  if (request.document) {
    const { data: fileData } = await supabaseAdmin.storage
      .from('documents')
      .download(request.document.storage_path);
    
    if (fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      documentHash = pdfUtils.generateDocumentHash(buffer);
    }
  }

  // Prepare certificate data
  const certData = {
    documentTitle: request.document?.title,
    documentId: request.document?.id,
    requestId: request.id,
    completedAt: request.updated_at,
    documentHash,
    signers: request.signers.map(s => ({
      name: s.signer_name || s.signer_email,
      email: s.signer_email,
      signedAt: s.signed_at,
      ip: s.signature?.meta?.ip || null,
    })),
  };

  // Generate certificate PDF
  const certificateBuffer = await pdfUtils.generateCertificate(certData);

  // Upload certificate
  const certPath = `certificates/${requestId}/certificate.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(certPath, certificateBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload certificate');
  }

  // Save certificate record
  await supabaseAdmin
    .from('completion_certificates')
    .upsert({
      request_id: requestId,
      certificate_path: certPath,
      metadata: certData,
    }, { onConflict: 'request_id' });

  return response.success(res, {
    requestId,
    certificatePath: certPath,
  }, 'Certificate generated');
});

/**
 * GET /internal/reminder-status/:signerId
 * Check reminder level for signer
 */
const getReminderStatus = catchAsync(async (req, res) => {
  const { signerId } = req.params;

  const { data: reminders, error } = await supabaseAdmin
    .from('reminder_tracking')
    .select('reminder_level, sent_at')
    .eq('signer_id', signerId)
    .order('reminder_level', { ascending: false });

  if (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch reminder status');
  }

  const currentLevel = reminders?.length > 0 ? reminders[0].reminder_level : 0;

  return response.success(res, {
    signerId,
    currentLevel,
    reminders: reminders || [],
    nextLevel: currentLevel < 3 ? currentLevel + 1 : null,
  }, 'Reminder status retrieved');
});

/**
 * POST /internal/record-reminder
 * Record reminder sent
 */
const recordReminder = catchAsync(async (req, res) => {
  const { signerId, level } = req.body;

  if (!level || level < 1 || level > 3) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Level must be 1, 2, or 3');
  }

  const { error } = await supabaseAdmin
    .from('reminder_tracking')
    .insert({
      signer_id: signerId,
      reminder_level: level,
    });

  if (error) {
    // Might be duplicate - that's okay
    console.log('Reminder already recorded or error:', error);
  }

  return response.success(res, { signerId, level }, 'Reminder recorded');
});

/**
 * POST /internal/broadcast-event
 * Broadcast event via WebSocket
 */
const broadcastEvent = catchAsync(async (req, res) => {
  const { requestId, eventType, data } = req.body;

  websocketServer.handleBroadcastRequest(requestId, eventType, data);

  return response.success(res, {
    broadcasted: true,
    eventType,
    requestId,
  }, 'Event broadcasted');
});

/**
 * POST /internal/process-document
 * Process uploaded document (extract metadata, thumbnail)
 */
const processDocument = catchAsync(async (req, res) => {
  const { documentId } = req.body;

  // Get document
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Download PDF
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(document.storage_path);

  if (downloadError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to download document');
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

  // Extract metadata
  const metadata = await pdfUtils.extractMetadata(pdfBuffer);

  // Save metadata
  await supabaseAdmin
    .from('document_metadata')
    .upsert({
      document_id: documentId,
      page_count: metadata.pageCount,
      file_size_bytes: metadata.fileSizeBytes,
      processed_at: new Date().toISOString(),
    }, { onConflict: 'document_id' });

  // Update document status
  await supabaseAdmin
    .from('documents')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', documentId);

  return response.success(res, {
    documentId,
    metadata,
  }, 'Document processed');
});

/**
 * POST /internal/create-notification
 * Create notification record
 */
const createNotification = catchAsync(async (req, res) => {
  const { recipientId, recipientEmail, channel, eventType, subject, content, metadata } = req.body;

  const { data: notification, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      recipient_id: recipientId || null,
      recipient_email: recipientEmail,
      channel: channel || 'email',
      event_type: eventType,
      subject,
      content,
      metadata: metadata || {},
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create notification');
  }

  return response.created(res, notification, 'Notification created');
});

/**
 * PUT /internal/notification/:id/status
 * Update notification status
 */
const updateNotificationStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, errorMessage } = req.body;

  const updateData = { status };
  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }
  if (status === 'failed' && errorMessage) {
    updateData.error_message = errorMessage;
  }
  if (status === 'retrying') {
    // Increment retry count
    const { data: current } = await supabaseAdmin
      .from('notifications')
      .select('retry_count')
      .eq('id', id)
      .single();
    
    updateData.retry_count = (current?.retry_count || 0) + 1;
  }

  const { error } = await supabaseAdmin
    .from('notifications')
    .update(updateData)
    .eq('id', id);

  if (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update notification');
  }

  return response.success(res, { id, status }, 'Notification status updated');
});

/**
 * GET /internal/failed-notifications
 * Get failed notifications for retry
 */
const getFailedNotifications = catchAsync(async (req, res) => {
  const { data: notifications, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('status', 'failed')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch notifications');
  }

  return response.success(res, notifications || [], 'Failed notifications retrieved');
});

module.exports = {
  // Placeholders
  createPlaceholder,
  getPlaceholders,
  deletePlaceholder,
  
  // PDF Processing
  applySignatureToPdf,
  updateWatermark,
  getDocumentThumbnail,
  
  // Internal endpoints
  expireRequests,
  getExpiringRequests,
  archiveDocument,
  logSigningSession,
  checkFraud,
  getSuspiciousSessions,
  generateCertificate,
  getReminderStatus,
  recordReminder,
  broadcastEvent,
  processDocument,
  createNotification,
  updateNotificationStatus,
  getFailedNotifications,
};
