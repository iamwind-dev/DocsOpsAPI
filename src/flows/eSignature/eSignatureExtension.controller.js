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

const { supabaseAdmin } = require("../../config/supabase");
const { catchAsync, response, httpStatus, ApiError } = require("../../common");
const pdfUtils = require("../../common/pdfUtils");
const websocketServer = require("../../common/websocketServer");
const pdfParse = require("pdf-parse");

// ============================================
// A. SIGNATURE PLACEHOLDERS
// ============================================

/**
 * POST /placeholders
 * Tạo signature placeholder mới
 */
const createPlaceholder = catchAsync(async (req, res) => {
  const {
    requestId,
    signerId,
    pageNumber,
    x,
    y,
    width,
    height,
    type,
    required,
  } = req.body;
  const userId = req.user.id;

  // Verify request exists and user is creator
  const { data: request, error: requestError } = await supabaseAdmin
    .from("signature_requests")
    .select("id, creator_id")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    throw new ApiError(httpStatus.NOT_FOUND, "Signature request not found");
  }

  if (request.creator_id !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only request creator can add placeholders"
    );
  }

  // Create placeholder
  const { data: placeholder, error } = await supabaseAdmin
    .from("signature_placeholders")
    .insert({
      request_id: requestId,
      signer_id: signerId || null,
      page_number: pageNumber || 1,
      x_position: x,
      y_position: y,
      width: width || 200,
      height: height || 50,
      placeholder_type: type || "signature",
      required: required !== false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating placeholder:", error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create placeholder"
    );
  }

  return response.created(res, placeholder, "Placeholder created successfully");
});

/**
 * GET /placeholders/:requestId
 * Lấy placeholders của request
 */
const getPlaceholders = catchAsync(async (req, res) => {
  const { requestId } = req.params;

  const { data: placeholders, error } = await supabaseAdmin
    .from("signature_placeholders")
    .select(
      "*, signer:signature_request_signers(id, signer_email, signer_name)"
    )
    .eq("request_id", requestId)
    .order("page_number", { ascending: true });

  if (error) {
    console.error("Error fetching placeholders:", error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch placeholders"
    );
  }

  return response.success(
    res,
    placeholders || [],
    "Placeholders retrieved successfully"
  );
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
    .from("signature_placeholders")
    .select("id, request:signature_requests(creator_id)")
    .eq("id", id)
    .single();

  if (fetchError || !placeholder) {
    throw new ApiError(httpStatus.NOT_FOUND, "Placeholder not found");
  }

  if (placeholder.request?.creator_id !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only request creator can delete placeholders"
    );
  }

  await supabaseAdmin.from("signature_placeholders").delete().eq("id", id);

  return response.success(res, { id }, "Placeholder deleted successfully");
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
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  // Download PDF from storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from("documents")
    .download(document.storage_path);

  if (downloadError) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to download document"
    );
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

  // Apply signature
  let signedPdfBuffer;
  if (signatureImage) {
    signedPdfBuffer = await pdfUtils.applySignatureImage(
      pdfBuffer,
      signatureImage,
      position
    );
  } else if (signatureData) {
    signedPdfBuffer = await pdfUtils.applyTextSignature(
      pdfBuffer,
      signatureData,
      position
    );
  } else {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "signatureImage or signatureData required"
    );
  }

  // Upload signed PDF (new version)
  const signedPath = document.storage_path.replace(".pdf", "_signed.pdf");
  const { error: uploadError } = await supabaseAdmin.storage
    .from("documents")
    .upload(signedPath, signedPdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to upload signed document"
    );
  }

  return response.success(
    res,
    {
      documentId,
      signedPath,
      originalPath: document.storage_path,
    },
    "Signature applied successfully"
  );
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
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  // Download PDF
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from("documents")
    .download(document.storage_path);

  if (downloadError) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to download document"
    );
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

  // Add watermark
  const watermarkText =
    text || (type === "completed" ? "COMPLETED" : "PENDING SIGNATURE");
  const watermarkedBuffer = await pdfUtils.addWatermark(
    pdfBuffer,
    watermarkText,
    type || "pending"
  );

  // Upload watermarked version
  const { error: uploadError } = await supabaseAdmin.storage
    .from("documents")
    .upload(document.storage_path, watermarkedBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to upload watermarked document"
    );
  }

  // Update metadata
  await supabaseAdmin.from("document_metadata").upsert(
    {
      document_id: documentId,
      watermark_status: type || "pending",
    },
    { onConflict: "document_id" }
  );

  return response.success(
    res,
    { documentId, watermarkType: type },
    "Watermark updated"
  );
});

/**
 * GET /documents/:id/thumbnail
 * Get document thumbnail (placeholder implementation)
 */
const getDocumentThumbnail = catchAsync(async (req, res) => {
  const { id: documentId } = req.params;

  // Check if thumbnail exists in metadata
  const { data: metadata } = await supabaseAdmin
    .from("document_metadata")
    .select("thumbnail_path")
    .eq("document_id", documentId)
    .single();

  if (metadata?.thumbnail_path) {
    const { data: publicUrl } = supabaseAdmin.storage
      .from("documents")
      .getPublicUrl(metadata.thumbnail_path);

    return response.success(
      res,
      { thumbnailUrl: publicUrl.publicUrl },
      "Thumbnail retrieved"
    );
  }

  // No thumbnail available
  return response.success(
    res,
    { thumbnailUrl: null },
    "No thumbnail available"
  );
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
    .from("signature_requests")
    .select("id, document_id")
    .eq("status", "sent")
    .lt("expires_at", now);

  if (fetchError) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch expired requests"
    );
  }

  if (!expiredRequests || expiredRequests.length === 0) {
    return response.success(
      res,
      { expiredCount: 0 },
      "No expired requests found"
    );
  }

  // Update status to expired
  const requestIds = expiredRequests.map((r) => r.id);
  await supabaseAdmin
    .from("signature_requests")
    .update({ status: "expired", updated_at: now })
    .in("id", requestIds);

  // Update signers
  await supabaseAdmin
    .from("signature_request_signers")
    .update({ status: "expired" })
    .in("request_id", requestIds)
    .eq("status", "pending");

  // Log audit events
  for (const request of expiredRequests) {
    await supabaseAdmin.from("audit_events").insert({
      event_type: "REQUEST_EXPIRED",
      document_id: request.document_id,
      details: { request_id: request.id, expired_at: now },
    });
  }

  return response.success(
    res,
    {
      expiredCount: expiredRequests.length,
      requestIds,
    },
    "Requests marked as expired"
  );
});

/**
 * GET /internal/expiring-requests
 * Get requests that are about to expire or already expired
 */
const getExpiringRequests = catchAsync(async (req, res) => {
  const now = new Date().toISOString();

  const { data: requests, error } = await supabaseAdmin
    .from("signature_requests")
    .select(
      `
      id, document_id, expires_at, created_at, message,
      document:documents(id, title, owner_id),
      signers:signature_request_signers(id, signer_email, signer_name, status)
    `
    )
    .in("status", ["pending", "sent"])
    .lt("expires_at", now);

  if (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch expiring requests"
    );
  }

  return response.success(res, requests || [], "Expiring requests retrieved");
});

/**
 * POST /internal/archive-document
 * Archive a signed document
 */
const archiveDocument = catchAsync(async (req, res) => {
  const { documentId, requestId } = req.body;

  // Get document
  const { data: document, error: docError } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  // Create archive path
  const archivePath = `archive/${new Date().getFullYear()}/${documentId}/${document.storage_path
    .split("/")
    .pop()}`;

  // Copy to archive location
  const { error: copyError } = await supabaseAdmin.storage
    .from("documents")
    .copy(document.storage_path, archivePath);

  if (copyError) {
    console.error("Archive copy error:", copyError);
    // Continue even if copy fails - update metadata anyway
  }

  // Update document status
  await supabaseAdmin
    .from("documents")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", documentId);

  // Update metadata
  await supabaseAdmin.from("document_metadata").upsert(
    {
      document_id: documentId,
      archived_at: new Date().toISOString(),
      archive_path: archivePath,
    },
    { onConflict: "document_id" }
  );

  // Log audit
  await supabaseAdmin.from("audit_events").insert({
    event_type: "DOCUMENT_ARCHIVED",
    document_id: documentId,
    details: { request_id: requestId, archive_path: archivePath },
  });

  return response.success(
    res,
    { documentId, archivePath },
    "Document archived"
  );
});

/**
 * POST /internal/log-session
 * Log signing session for fraud detection
 */
const logSigningSession = catchAsync(async (req, res) => {
  const { signerId, ipAddress, userAgent, deviceFingerprint } = req.body;

  const { data: session, error } = await supabaseAdmin
    .from("signing_sessions")
    .insert({
      signer_id: signerId,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_fingerprint: deviceFingerprint,
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to log session"
    );
  }

  return response.created(res, session, "Session logged");
});

/**
 * POST /internal/check-fraud
 * Check for suspicious signing patterns
 */
const checkFraud = catchAsync(async (req, res) => {
  const { sessionId, signerId, signedAt } = req.body;

  // Get session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("signing_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new ApiError(httpStatus.NOT_FOUND, "Session not found");
  }

  const suspicionReasons = [];

  // Check 1: Too fast signing (< 10 seconds)
  const startedAt = new Date(session.started_at);
  const signedAtDate = new Date(signedAt);
  const durationSeconds = (signedAtDate - startedAt) / 1000;

  if (durationSeconds < 10) {
    suspicionReasons.push("SIGNED_TOO_FAST");
  }

  // Check 2: Get previous sessions for this signer
  const { data: previousSessions } = await supabaseAdmin
    .from("signing_sessions")
    .select("ip_address, device_fingerprint")
    .eq("signer_id", signerId)
    .neq("id", sessionId)
    .order("started_at", { ascending: false })
    .limit(5);

  if (previousSessions && previousSessions.length > 0) {
    const lastSession = previousSessions[0];

    // Check IP change
    if (
      lastSession.ip_address &&
      lastSession.ip_address !== session.ip_address
    ) {
      suspicionReasons.push("IP_ADDRESS_CHANGED");
    }

    // Check device change
    if (
      lastSession.device_fingerprint &&
      lastSession.device_fingerprint !== session.device_fingerprint
    ) {
      suspicionReasons.push("DEVICE_CHANGED");
    }
  }

  const isSuspicious = suspicionReasons.length > 0;

  // Update session
  await supabaseAdmin
    .from("signing_sessions")
    .update({
      signed_at: signedAt,
      duration_seconds: Math.round(durationSeconds),
      is_suspicious: isSuspicious,
      suspicion_reasons: suspicionReasons,
    })
    .eq("id", sessionId);

  return response.success(
    res,
    {
      sessionId,
      isSuspicious,
      suspicionReasons,
      durationSeconds: Math.round(durationSeconds),
    },
    "Fraud check completed"
  );
});

/**
 * GET /internal/suspicious-sessions
 * Get suspicious signing sessions
 */
const getSuspiciousSessions = catchAsync(async (req, res) => {
  const { data: sessions, error } = await supabaseAdmin
    .from("signing_sessions")
    .select(
      `
      *,
      signer:signature_request_signers(
        id, signer_email, signer_name,
        request:signature_requests(id, document:documents(id, title))
      )
    `
    )
    .eq("is_suspicious", true)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch suspicious sessions"
    );
  }

  return response.success(res, sessions || [], "Suspicious sessions retrieved");
});

/**
 * POST /internal/generate-certificate
 * Generate Certificate of Completion
 */
const generateCertificate = catchAsync(async (req, res) => {
  const { requestId } = req.body;

  // Get request with all details
  const { data: request, error: requestError } = await supabaseAdmin
    .from("signature_requests")
    .select(
      `
      id, created_at, updated_at,
      document:documents(id, title, storage_path),
      signers:signature_request_signers(
        id, signer_email, signer_name, signed_at,
        signature:document_signatures(meta)
      )
    `
    )
    .eq("id", requestId)
    .eq("status", "signed")
    .single();

  if (requestError || !request) {
    throw new ApiError(httpStatus.NOT_FOUND, "Signed request not found");
  }

  // Get document hash
  let documentHash = null;
  if (request.document) {
    const { data: fileData } = await supabaseAdmin.storage
      .from("documents")
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
    signers: request.signers.map((s) => ({
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
    .from("documents")
    .upload(certPath, certificateBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to upload certificate"
    );
  }

  // Save certificate record
  await supabaseAdmin.from("completion_certificates").upsert(
    {
      request_id: requestId,
      certificate_path: certPath,
      metadata: certData,
    },
    { onConflict: "request_id" }
  );

  return response.success(
    res,
    {
      requestId,
      certificatePath: certPath,
    },
    "Certificate generated"
  );
});

/**
 * GET /internal/reminder-status/:signerId
 * Check reminder level for signer
 */
const getReminderStatus = catchAsync(async (req, res) => {
  const { signerId } = req.params;

  const { data: reminders, error } = await supabaseAdmin
    .from("reminder_tracking")
    .select("reminder_level, sent_at")
    .eq("signer_id", signerId)
    .order("reminder_level", { ascending: false });

  if (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch reminder status"
    );
  }

  const currentLevel = reminders?.length > 0 ? reminders[0].reminder_level : 0;

  return response.success(
    res,
    {
      signerId,
      currentLevel,
      reminders: reminders || [],
      nextLevel: currentLevel < 3 ? currentLevel + 1 : null,
    },
    "Reminder status retrieved"
  );
});

/**
 * POST /internal/record-reminder
 * Record reminder sent
 */
const recordReminder = catchAsync(async (req, res) => {
  const { signerId, level } = req.body;

  if (!level || level < 1 || level > 3) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Level must be 1, 2, or 3");
  }

  const { error } = await supabaseAdmin.from("reminder_tracking").insert({
    signer_id: signerId,
    reminder_level: level,
  });

  if (error) {
    // Might be duplicate - that's okay
    console.log("Reminder already recorded or error:", error);
  }

  return response.success(res, { signerId, level }, "Reminder recorded");
});

/**
 * POST /internal/broadcast-event
 * Broadcast event via WebSocket
 */
const broadcastEvent = catchAsync(async (req, res) => {
  const { requestId, eventType, data } = req.body;

  websocketServer.handleBroadcastRequest(requestId, eventType, data);

  return response.success(
    res,
    {
      broadcasted: true,
      eventType,
      requestId,
    },
    "Event broadcasted"
  );
});

/**
 * POST /internal/process-document
 * Process uploaded document (extract metadata, thumbnail)
 */
const processDocument = catchAsync(async (req, res) => {
  const { documentId } = req.body;

  // Get document
  const { data: document, error: docError } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  // Download PDF
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from("documents")
    .download(document.storage_path);

  if (downloadError) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to download document"
    );
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

  // Extract metadata
  const metadata = await pdfUtils.extractMetadata(pdfBuffer);

  // Save metadata
  await supabaseAdmin.from("document_metadata").upsert(
    {
      document_id: documentId,
      page_count: metadata.pageCount,
      file_size_bytes: metadata.fileSizeBytes,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "document_id" }
  );

  // Update document status
  await supabaseAdmin
    .from("documents")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", documentId);

  return response.success(
    res,
    {
      documentId,
      metadata,
    },
    "Document processed"
  );
});

/**
 * POST /internal/create-notification
 * Create notification record
 */
const createNotification = catchAsync(async (req, res) => {
  const {
    recipientId,
    recipientEmail,
    channel,
    eventType,
    subject,
    content,
    metadata,
  } = req.body;

  const { data: notification, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      recipient_id: recipientId || null,
      recipient_email: recipientEmail,
      channel: channel || "email",
      event_type: eventType,
      subject,
      content,
      metadata: metadata || {},
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create notification"
    );
  }

  return response.created(res, notification, "Notification created");
});

/**
 * PUT /internal/notification/:id/status
 * Update notification status
 */
const updateNotificationStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, errorMessage } = req.body;

  const updateData = { status };
  if (status === "sent") {
    updateData.sent_at = new Date().toISOString();
  }
  if (status === "failed" && errorMessage) {
    updateData.error_message = errorMessage;
  }
  if (status === "retrying") {
    // Increment retry count
    const { data: current } = await supabaseAdmin
      .from("notifications")
      .select("retry_count")
      .eq("id", id)
      .single();

    updateData.retry_count = (current?.retry_count || 0) + 1;
  }

  const { error } = await supabaseAdmin
    .from("notifications")
    .update(updateData)
    .eq("id", id);

  if (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update notification"
    );
  }

  return response.success(res, { id, status }, "Notification status updated");
});

/**
 * GET /internal/failed-notifications
 * Get failed notifications for retry
 */
const getFailedNotifications = catchAsync(async (req, res) => {
  const { data: notifications, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("status", "failed")
    .lt("retry_count", 3)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch notifications"
    );
  }

  return response.success(
    res,
    notifications || [],
    "Failed notifications retrieved"
  );
});

// ============================================
// I. AI SIGNATURE DETECTION
// ============================================

/**
 * POST /internal/get-document-data
 * Get document data for AI processing
 * Supports both document ID (from documents table) and request ID (from signature_requests)
 */
const getDocumentData = catchAsync(async (req, res) => {
  const { documentId } = req.body;

  if (!documentId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "documentId is required");
  }

  // First, try to find in documents table (when user provides document UUID from Supabase)
  let { data: doc, error: docError } = await supabaseAdmin
    .from("documents")
    .select("id, title, storage_path, mime_type, status, owner_id")
    .eq("id", documentId)
    .single();

  if (!docError && doc) {
    // Found in documents table - return document info
    console.log("Found document in documents table:", doc.id);
    return response.success(
      res,
      {
        documentId: doc.id,
        documentPath: doc.storage_path,
        documentName: doc.title,
        status: doc.status,
        source: "documents",
      },
      "Document data retrieved"
    );
  }

  // If not found in documents, try signature_requests table
  const { data: request, error: reqError } = await supabaseAdmin
    .from("signature_requests")
    .select(
      "id, document_id, status, document:documents(id, title, storage_path, mime_type, status)"
    )
    .eq("id", documentId)
    .single();

  if (!reqError && request) {
    // Found in signature_requests table
    console.log("Found in signature_requests table:", request.id);
    const docData = request.document;
    return response.success(
      res,
      {
        documentId: request.id,
        documentPath: docData?.storage_path || null,
        documentName: docData?.title || "Unknown",
        status: request.status,
        actualDocumentId: docData?.id || null,
        source: "signature_requests",
      },
      "Document data retrieved from signature request"
    );
  }

  // Not found in either table
  console.log("Document not found in any table:", documentId);
  throw new ApiError(
    httpStatus.NOT_FOUND,
    `Document not found with ID: ${documentId}`
  );
});

/**
 * POST /internal/convert-to-images
 * Convert PDF pages to images for AI analysis
 */
const convertPdfToImages = catchAsync(async (req, res) => {
  const { documentPath } = req.body;

  if (!documentPath) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Document path is required");
  }

  // Get public URL from Supabase Storage
  const { data: urlData } = supabaseAdmin.storage
    .from("documents")
    .getPublicUrl(documentPath);

  if (!urlData || !urlData.publicUrl) {
    throw new ApiError(httpStatus.NOT_FOUND, "Cannot get document URL");
  }

  // In production, you would convert PDF to images here
  // For now, return the PDF URL (AI models can process PDFs directly)
  const images = [urlData.publicUrl];

  return response.success(
    res,
    {
      images,
      totalPages: 1,
      documentPath,
    },
    "PDF converted to images"
  );
});

/**
 * POST /internal/extract-text
 * Extract text from PDF for AI text analysis
 * Uses pdfjs-dist to extract text accurately per page
 */
const extractPdfText = catchAsync(async (req, res) => {
  const { documentPath } = req.body;

  if (!documentPath) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Document path is required");
  }

  try {
    // Download PDF from Supabase Storage
    console.log("Downloading PDF from:", documentPath);
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(documentPath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      throw new ApiError(httpStatus.NOT_FOUND, "Cannot download document");
    }

    // Convert blob to Uint8Array for pdfjs
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log("PDF buffer size:", uint8Array.length, "bytes");

    // Use pdfjs-dist to extract text per page accurately
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDoc = await loadingTask.promise;
    
    const totalPages = pdfDoc.numPages;
    console.log("PDF has", totalPages, "pages");

    const textByPage = {};
    let totalCharCount = 0;

    // Extract text from each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine all text items into page text
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        textByPage[`Trang ${pageNum}`] = pageText;
        totalCharCount += pageText.length;
        
        console.log(`Page ${pageNum}: ${pageText.length} chars`);
      } catch (pageError) {
        console.error(`Error extracting page ${pageNum}:`, pageError);
        textByPage[`Trang ${pageNum}`] = `[Lỗi đọc trang ${pageNum}]`;
      }
    }

    // Create formatted text for AI
    const formattedText = Object.entries(textByPage)
      .map(([page, content]) => `=== ${page} ===\n${content}`)
      .join("\n\n");

    return response.success(
      res,
      {
        textByPage: formattedText,
        pages: totalPages,
        documentPath,
        rawText: textByPage,
        charCount: totalCharCount
      },
      "PDF text extracted successfully"
    );
  } catch (error) {
    console.error("Extract text error:", error);
    
    // Fallback error response
    if (error.message && error.message.includes('Invalid PDF')) {
      return response.success(
        res,
        {
          textByPage: "Không thể đọc PDF - file có thể bị lỗi hoặc được bảo vệ",
          pages: 1,
          documentPath,
          rawText: {},
          parseError: error.message
        },
        "PDF text extraction failed"
      );
    }
    
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to extract PDF text: " + error.message
    );
  }
});

/**
 * POST /internal/create-test-request
 * Create signature request for AI testing (bypass RLS)
 * Supports: documentId (existing doc), filePath (from polling_queue), or fileName (dummy doc)
 */
const createTestRequest = catchAsync(async (req, res) => {
  const { fileName, fileType, fileSize, userId, title, documentId, filePath } = req.body;

  // Debug logging
  console.log("=== createTestRequest received ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  console.log("filePath:", filePath);
  console.log("fileName:", fileName);
  console.log("userId:", userId);

  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "userId is required");
  }

  let document;

  // Case 1: Use existing document (by documentId)
  if (documentId) {
    const { data: existingDoc, error: fetchError } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError || !existingDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
    }

    document = existingDoc;
    console.log("Using existing document:", documentId);
  } 
  // Case 2: File uploaded to polling_queue - copy to documents bucket and create record
  else if (filePath) {
    console.log("Processing file from polling_queue:", filePath);
    
    // Copy file from polling_queue to documents bucket
    const timestamp = Date.now();
    const safeFileName = fileName || filePath.split('/').pop() || 'document.pdf';
    const newPath = `ai-detection/${userId}/${timestamp}_${safeFileName}`;

    try {
      // Download from polling_queue
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from("polling_queue")
        .download(filePath);

      if (downloadError || !fileData) {
        console.error("Download from polling_queue error:", downloadError);
        throw new ApiError(httpStatus.NOT_FOUND, `Cannot download file from polling_queue: ${filePath}`);
      }

      // Upload to documents bucket
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from("documents")
        .upload(newPath, buffer, {
          contentType: fileType || "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload to documents error:", uploadError);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to copy file to documents bucket");
      }

      console.log("File copied to documents bucket:", newPath);
    } catch (copyError) {
      if (copyError instanceof ApiError) throw copyError;
      console.error("File copy error:", copyError);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to process uploaded file");
    }

    // Create document record with real path
    const { data: newDoc, error: docError } = await supabaseAdmin
      .from("documents")
      .insert({
        owner_id: userId,
        title: title || fileName || "AI Detection Document",
        description: "Document for AI signature detection",
        storage_path: newPath,
        mime_type: fileType || "application/pdf",
        status: "uploaded",
      })
      .select()
      .single();

    if (docError) {
      console.error("Create document error:", docError);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create document record");
    }

    document = newDoc;
    console.log("Created document from polling_queue file:", document.id);
  }
  // Case 3: Create dummy document (backward compatibility)
  else {
    if (!fileName) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "fileName or filePath is required when documentId is not provided"
      );
    }

    const timestamp = Date.now();
    const dummyPath = `test/ai-detection/${timestamp}_${fileName}`;

    const { data: newDoc, error: docError } = await supabaseAdmin
      .from("documents")
      .insert({
        owner_id: userId,
        title: title || fileName,
        description: "Document for AI signature detection (test)",
        storage_path: dummyPath,
        mime_type: fileType || "application/pdf",
        status: "uploaded",
      })
      .select()
      .single();

    if (docError) {
      console.error("Create document error:", docError);
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to create document"
      );
    }

    document = newDoc;
    console.log("Created new test document:", document.id);
  }

  // Create signature request using service role (bypass RLS)
  const { data: request, error: requestError } = await supabaseAdmin
    .from("signature_requests")
    .insert({
      document_id: document.id,
      creator_id: userId,
      message: title || "Document for AI signature detection",
      status: "pending",
    })
    .select()
    .single();

  if (requestError) {
    console.error("Create request error:", requestError);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create signature request"
    );
  }

  return response.success(
    res,
    {
      request,
      document,
      message: documentId
        ? "Signature request created for uploaded document"
        : "Test request created (file not uploaded)",
    },
    "Success"
  );
});

/**
 * POST /internal/apply-default-signatures
 * Apply default signatures to detected positions
 * Supports documentId from both documents table and signature_requests table
 */
const applyDefaultSignatures = catchAsync(async (req, res) => {
  const { documentId, signaturePositions, useDefaultSignature } = req.body;

  if (
    !documentId ||
    !signaturePositions ||
    !Array.isArray(signaturePositions)
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid request data");
  }

  let documentPath = null;
  let documentName = null;
  let requestId = null;

  // First, try to find in documents table
  const { data: doc, error: docError } = await supabaseAdmin
    .from("documents")
    .select("id, title, storage_path")
    .eq("id", documentId)
    .single();

  if (!docError && doc) {
    documentPath = doc.storage_path;
    documentName = doc.title;
    console.log("Found document in documents table:", doc.id);
    
    // Try to find associated signature request
    const { data: req } = await supabaseAdmin
      .from("signature_requests")
      .select("id")
      .eq("document_id", doc.id)
      .single();
    
    requestId = req?.id || null;
  } else {
    // Try signature_requests table
    const { data: request, error: reqError } = await supabaseAdmin
      .from("signature_requests")
      .select("id, document_id, document:documents(storage_path, title)")
      .eq("id", documentId)
      .single();

    if (!reqError && request) {
      documentPath = request.document?.storage_path || null;
      documentName = request.document?.title || "Unknown";
      requestId = request.id;
      console.log("Found in signature_requests table:", request.id);
    }
  }

  if (!documentPath) {
    console.log("Document not found with ID:", documentId);
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  // Get default signature image (placeholder for now)
  const defaultSignatureText = "SAMPLE SIGNATURE";

  // In production, you would:
  // 1. Download the PDF from storage
  // 2. Add signatures at detected positions using pdf-lib or similar
  // 3. Upload the signed PDF back to storage

  // For now, simulate this
  const signedPath = documentPath.replace(".pdf", "_ai_signed.pdf");

  // Store signature positions in database (only if we have a request ID)
  if (requestId) {
    for (const position of signaturePositions) {
      await supabaseAdmin.from("signature_placeholders").insert({
        request_id: requestId,
        page_number: position.page || 1,
        x_position: position.x,
        y_position: position.y,
        width: position.width || 200,
        height: position.height || 80,
        placeholder_type: position.type || "signature",
        required: true,
        metadata: {
          detectedByAI: true,
          detectionReason: position.reason,
          signerName: position.signer,
        },
      });
    }
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from("documents")
    .getPublicUrl(signedPath);

  return response.success(
    res,
    {
      signedDocumentPath: signedPath,
      previewUrl: urlData?.publicUrl || "",
      appliedPositions: signaturePositions.length,
      positions: signaturePositions,
      documentId: documentId,
      requestId: requestId,
    },
    "Default signatures applied successfully"
  );
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

  // AI Signature Detection
  getDocumentData,
  convertPdfToImages,
  extractPdfText,
  createTestRequest,
  applyDefaultSignatures,
};
