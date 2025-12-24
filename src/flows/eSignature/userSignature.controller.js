/**
 * User Signature Controller
 * 
 * Workflow 17: User Signature Creation & Management
 * Xử lý API endpoints cho chữ ký điện tử của user
 * 
 * KHÔNG ảnh hưởng code hiện tại - module độc lập
 */

const { catchAsync, response, httpStatus, ApiError } = require('../../common');
const userSignatureService = require('./userSignature.service');
const { supabaseAdmin } = require('../../config/supabase');
const n8nClient = require('../../common/n8nClient');

/**
 * POST /user-signature
 * Tạo chữ ký mới cho user (internal - từ n8n)
 */
const createUserSignature = catchAsync(async (req, res) => {
  const { userId, signatureImage, pinHash, signatureType } = req.body;

  console.log('=== CREATE USER SIGNATURE START ===');
  console.log('userId:', userId);
  console.log('signatureType:', signatureType);
  console.log('pinHash:', pinHash ? '***PROVIDED***' : 'MISSING');
  console.log('signatureImage length:', signatureImage ? signatureImage.length : 'MISSING');

  if (!userId || !signatureImage || !pinHash) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'userId, signatureImage, and pinHash are required');
  }

  // Upload image
  console.log('Step 1: Uploading signature image...');
  const { storagePath, publicUrl } = await userSignatureService.uploadSignatureImage(
    userId, 
    signatureImage, 
    signatureType || 'drawn'
  );
  console.log('Upload successful:', { storagePath, publicUrl });

  // Unset other defaults
  console.log('Step 2: Unsetting other defaults...');
  const { error: updateError } = await supabaseAdmin
    .from('user_signature_images')
    .update({ is_default: false })
    .eq('user_id', userId);
  
  if (updateError) {
    console.error('Update defaults error:', updateError);
  } else {
    console.log('Defaults updated successfully');
  }

  // Save to database
  console.log('Step 3: Inserting new signature record...');
  const insertData = {
    user_id: userId,
    signature_type: signatureType || 'drawn',
    image_storage_path: storagePath,
    image_url: publicUrl,
    is_default: true,
    metadata: { created_via: 'n8n_workflow17' },
  };
  console.log('Insert data:', JSON.stringify(insertData, null, 2));

  const { data: signatureRecord, error: insertError } = await supabaseAdmin
    .from('user_signature_images')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error('=== INSERT ERROR ===');
    console.error('Error code:', insertError.code);
    console.error('Error message:', insertError.message);
    console.error('Error details:', insertError.details);
    console.error('Error hint:', insertError.hint);
    console.error('Full error:', JSON.stringify(insertError, null, 2));
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to save signature: ${insertError.message}`);
  }

  console.log('Insert successful:', signatureRecord.id);

  // Update or create user_signatures with pinHash
  console.log('Step 4: Updating user_signatures...');
  const { data: existingSignature } = await supabaseAdmin
    .from('user_signatures')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingSignature) {
    await supabaseAdmin
      .from('user_signatures')
      .update({ pin_hash: pinHash, updated_at: new Date().toISOString() })
      .eq('id', existingSignature.id);
  } else {
    const crypto = require('crypto');
    const secretKey = crypto.randomBytes(32).toString('hex');
    
    await supabaseAdmin
      .from('user_signatures')
      .insert({
        user_id: userId,
        pin_hash: pinHash,
        secret_key: secretKey,
        label: 'Default Signature',
      });
  }

  return response.created(res, {
    signatureImageId: signatureRecord.id,
    imageUrl: publicUrl,
    signatureType: signatureRecord.signature_type,
    isDefault: true,
  }, 'User signature created successfully');
});

/**
 * POST /internal/create-with-pin
 * Tạo chữ ký từ n8n với plain PIN (backend sẽ hash)
 */
const createUserSignatureWithPin = catchAsync(async (req, res) => {
  const { userId, userEmail, signatureImage, pin, signatureType, label, isDefault } = req.body;

  console.log('=== CREATE USER SIGNATURE WITH PIN (N8N) ===');
  console.log('userId:', userId);
  console.log('userEmail:', userEmail);
  console.log('signatureType:', signatureType);
  console.log('pin provided:', pin ? 'YES' : 'NO');
  console.log('signatureImage:', signatureImage ? `data:image/... (${signatureImage.length} chars)` : 'MISSING');

  if (!userId || !signatureImage || !pin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'userId, signatureImage, and pin are required');
  }

  if (pin.length < 4) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PIN must be at least 4 characters');
  }

  // Decode base64 data URI to buffer
  let imageBuffer;
  try {
    // Remove data URI prefix if present
    const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
    console.log('Image buffer created, size:', imageBuffer.length, 'bytes');
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid base64 image data');
  }

  // Use existing service function that handles everything
  const result = await userSignatureService.createUserSignatureFromBuffer({
    userId,
    imageBuffer,
    pin,
    signatureType: signatureType || 'drawn',
    label,
    isDefault: isDefault !== false
  });

  return response.created(res, result, 'User signature created successfully via n8n');
});

/**
 * POST /create-user-signature
 * Tạo chữ ký từ frontend (User Auth)
 * Gọi n8n webhook để xử lý
 */
const createUserSignatureFromFrontend = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { pin, signatureType, label, isDefault } = req.body;

  console.log('Step 1: Received request from frontend');
  console.log('User ID:', userId);
  console.log('Body:', { pin: '***', signatureType, label, isDefault });
  console.log('File:', req.file ? { size: req.file.size, mimetype: req.file.mimetype } : 'NO FILE');

  if (!req.file || !pin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'signatureImage (file) and pin are required');
  }

  if (pin.length < 4) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PIN must be at least 4 characters');
  }

  console.log('Step 2: Calling n8n webhook...');

  // Gọi n8n webhook để xử lý pipeline
  try {
    // Convert buffer to base64 with data URI prefix
    const signatureBase64 = req.file.buffer.toString('base64');
    
    const n8nResponse = await n8nClient.triggerWebhook('e-signature/create-user-signature', {
      userId,
      userEmail: req.user.email,
      signatureImage: `data:image/png;base64,${signatureBase64}`,
      pin,
      signatureType: signatureType || 'drawn',
      label,
      isDefault: isDefault === 'true' || isDefault === true
    });

    console.log('Step 3: N8N response received:', n8nResponse);

    return response.created(res, {
      message: 'User signature creation workflow triggered',
      workflowResponse: n8nResponse
    });
  } catch (error) {
    // Fallback: xử lý trực tiếp nếu n8n không available
    console.error('=== N8N WEBHOOK ERROR ===');
    console.error('Error:', error.message);
    console.log('N8N not available, processing directly');
    
    const result = await userSignatureService.createUserSignatureFromBuffer({
      userId,
      imageBuffer: req.file.buffer,
      pin,
      signatureType: signatureType || 'drawn',
      label,
      isDefault: isDefault === 'true' || isDefault === true
    });

    return response.created(res, {
      message: 'User signature created successfully (direct processing)',
      ...result
    });
  }
});

/**
 * GET /my-signatures
 * Lấy danh sách chữ ký của user hiện tại
 */
const getMySignatures = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const signatures = await userSignatureService.getUserSignatures(userId);

  return response.success(res, signatures, 'User signatures retrieved');
});

/**
 * GET /my-signature/default
 * Lấy chữ ký mặc định của user
 */
const getMyDefaultSignature = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const signature = await userSignatureService.getDefaultSignature(userId);

  if (!signature) {
    return response.success(res, null, 'No default signature found');
  }

  return response.success(res, signature, 'Default signature retrieved');
});

/**
 * DELETE /my-signatures/:id
 * Xóa chữ ký
 */
const deleteMySignature = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  await userSignatureService.deleteSignature(id, userId);

  // Log audit
  await supabaseAdmin.from('audit_events').insert({
    actor_id: userId,
    event_type: 'SIGNATURE_DELETED',
    details: { signature_image_id: id },
  });

  return response.success(res, { id }, 'Signature deleted successfully');
});

/**
 * PUT /my-signatures/:id/set-default
 * Set chữ ký làm mặc định
 */
const setDefaultSignature = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const signature = await userSignatureService.setDefaultSignature(id, userId);

  return response.success(res, signature, 'Default signature updated');
});

/**
 * POST /verify-pin
 * Xác thực PIN của user
 */
const verifyPin = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { pin } = req.body;

  if (!pin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PIN is required');
  }

  const isValid = await userSignatureService.verifyPin(userId, pin);

  return response.success(res, { valid: isValid }, isValid ? 'PIN verified' : 'Invalid PIN');
});

/**
 * PUT /update-pin
 * Cập nhật PIN
 */
const updatePin = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { currentPin, newPin } = req.body;

  if (!currentPin || !newPin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'currentPin and newPin are required');
  }

  if (newPin.length < 4) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New PIN must be at least 4 characters');
  }

  // Verify current PIN
  const isValid = await userSignatureService.verifyPin(userId, currentPin);
  if (!isValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Current PIN is incorrect');
  }

  // Update PIN
  const newPinHash = userSignatureService.hashPin(newPin);
  
  const { error } = await supabaseAdmin
    .from('user_signatures')
    .update({ pin_hash: newPinHash, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update PIN');
  }

  // Log audit
  await supabaseAdmin.from('audit_events').insert({
    actor_id: userId,
    event_type: 'PIN_UPDATED',
    details: { updated_at: new Date().toISOString() },
  });

  return response.success(res, { updated: true }, 'PIN updated successfully');
});

/**
 * POST /force-rehash-pin
 * Re-hash PIN để fix lỗi trim (chỉ dùng khi cần thiết)
 */
const forceRehashPin = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { pin } = req.body;

  if (!pin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PIN is required');
  }

  console.log('=== FORCE REHASH PIN ===');
  console.log('User ID:', userId);
  console.log('PIN input:', `"${pin}"`, 'Length:', pin.length);

  // Re-hash PIN with trim
  const newPinHash = userSignatureService.hashPin(pin);
  
  const { error } = await supabaseAdmin
    .from('user_signatures')
    .update({ pin_hash: newPinHash, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error('Rehash error:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to rehash PIN');
  }

  console.log('✅ PIN rehashed successfully');

  return response.success(res, { updated: true, newHash: newPinHash.substring(0, 16) + '...' }, 'PIN rehashed successfully');
});

/**
 * POST /insert-signature-to-pdf
 * Chèn chữ ký vào file PDF
 */
const insertSignatureToPdf = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { signatureId, pageNumber, position, x, y, width, height, pin } = req.body;

  console.log('=== INSERT SIGNATURE TO PDF ===');
  console.log('User ID:', userId);
  console.log('Signature ID:', signatureId);
  console.log('Page:', pageNumber);
  console.log('Position:', position);
  console.log('PIN received:', pin, 'Type:', typeof pin);
  console.log('File:', req.file ? { size: req.file.size, mimetype: req.file.mimetype } : 'NO FILE');

  // Validate PIN first
  if (!pin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PIN is required for signing');
  }

  // Convert PIN to string to ensure consistency
  const pinString = String(pin).trim();
  
  console.log('PIN after conversion:', pinString, 'Length:', pinString.length);
  
  const isPinValid = await userSignatureService.verifyPin(userId, pinString);
  console.log('PIN validation result:', isPinValid);
  
  if (!isPinValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid PIN. Cannot sign document.');
  }

  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PDF file is required');
  }

  if (!signatureId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'signatureId is required');
  }

  if (!pageNumber || pageNumber < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'pageNumber must be >= 1');
  }

  // Validate file type
  if (req.file.mimetype !== 'application/pdf') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File must be PDF');
  }

  // Validate PDF header
  const pdfHeader = req.file.buffer.slice(0, 5).toString('utf-8');
  if (pdfHeader !== '%PDF-') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid PDF file (missing PDF header)');
  }

  // Get signature from database
  const { data: signature, error: sigError } = await supabaseAdmin
    .from('user_signature_images')
    .select('id, image_url, image_storage_path, metadata')
    .eq('id', signatureId)
    .eq('user_id', userId)
    .single();

  if (sigError || !signature) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Signature not found or not owned by user');
  }

  console.log('Signature found:', signature.id);

  // Process PDF with signature insertion
  const PDFLib = require('pdf-lib');
  
  try {
    // Load PDF
    const pdfDoc = await PDFLib.PDFDocument.load(req.file.buffer);
    const pages = pdfDoc.getPages();
    const pageIndex = parseInt(pageNumber) - 1; // 0-indexed

    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Page ${pageNumber} does not exist (PDF has ${pages.length} pages)`);
    }

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Download signature image from Supabase Storage
    const signatureImageUrl = signature.image_url;
    const imageResponse = await fetch(signatureImageUrl);
    
    if (!imageResponse.ok) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch signature image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Embed image (try PNG first, then JPEG)
    let embeddedImage;
    try {
      embeddedImage = await pdfDoc.embedPng(imageBuffer);
    } catch (e) {
      try {
        embeddedImage = await pdfDoc.embedJpg(imageBuffer);
      } catch (e2) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Unsupported signature image format');
      }
    }

    // Calculate position
    const sigWidth = parseInt(width) || 150;
    const sigHeight = parseInt(height) || 75;
    const padding = 20;

    let sigX, sigY;

    if (position === 'custom' && x !== undefined && y !== undefined) {
      sigX = parseInt(x);
      sigY = pageHeight - parseInt(y) - sigHeight; // PDF coords from bottom
    } else {
      // Preset positions
      switch (position) {
        case 'bottom-right':
          sigX = pageWidth - sigWidth - padding;
          sigY = padding;
          break;
        case 'bottom-left':
          sigX = padding;
          sigY = padding;
          break;
        case 'top-right':
          sigX = pageWidth - sigWidth - padding;
          sigY = pageHeight - sigHeight - padding;
          break;
        case 'top-left':
          sigX = padding;
          sigY = pageHeight - sigHeight - padding;
          break;
        case 'center':
          sigX = (pageWidth - sigWidth) / 2;
          sigY = (pageHeight - sigHeight) / 2;
          break;
        default: // bottom-right
          sigX = pageWidth - sigWidth - padding;
          sigY = padding;
      }
    }

    // Draw signature on PDF
    page.drawImage(embeddedImage, {
      x: sigX,
      y: sigY,
      width: sigWidth,
      height: sigHeight,
      opacity: 1.0
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    console.log('PDF processed successfully, size:', pdfBytes.length);

    // Lưu PDF đã ký vào Supabase Storage
    const timestamp = Date.now();
    const signedFileName = `signed_${timestamp}_${req.file.originalname || 'document.pdf'}`;
    const storagePath = `documents/${userId}/${signedFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, Buffer.from(pdfBytes), {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload signed PDF error:', uploadError);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to save signed PDF');
    }
    
    // Lấy public URL của file đã ký
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(storagePath);
    
    const signedPdfUrl = urlData?.publicUrl;
    console.log('Signed PDF uploaded:', signedPdfUrl);
    
    // Tạo document record mới cho file đã ký
    const { data: newDocument, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: `[Signed] ${req.file.originalname || 'Document'}`,
        description: `Signed by user at ${new Date().toISOString()}`,
        owner_id: userId,
        storage_path: storagePath,
        // file_type: 'application/pdf', // Column not found
        // file_size: pdfBytes.length, // Column not found
        // status: 'active', // Check constraint violation
        // metadata: { ... } // Column not found
        // metadata: {
        //   original_file: req.file.originalname,
        //   signed_at: new Date().toISOString(),
        //   signature_id: signature.id,
        //   page_signed: pageNumber,
        //   signature_position: { x: sigX, y: sigY, width: sigWidth, height: sigHeight }
        // }
      })
      .select()
      .single();
    
    if (docError) {
      console.error('Create document record error:', docError);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to save signed document record: ' + docError.message);
    }
    
    console.log('Document record created:', newDocument?.id);

    // Return PDF as base64 cùng với document info
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    return response.success(res, {
      pdfBase64: `data:application/pdf;base64,${pdfBase64}`,
      pdfSize: pdfBytes.length,
      signatureId: signature.id,
      page: pageNumber,
      position: { x: Math.round(sigX), y: Math.round(pageHeight - sigY - sigHeight) },
      size: { width: sigWidth, height: sigHeight },
      // Thông tin document đã ký (quan trọng để gửi signature request)
      document: newDocument ? {
        id: newDocument.id,
        title: newDocument.title,
        storage_path: newDocument.storage_path,
        url: signedPdfUrl
      } : null,
      signedPdfUrl: signedPdfUrl
    }, 'Signature inserted and document saved successfully');

  } catch (error) {
    console.error('PDF processing error:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to process PDF: ${error.message}`);
  }
});

module.exports = {
  createUserSignature,
  createUserSignatureWithPin,
  createUserSignatureFromFrontend,
  getMySignatures,
  getMyDefaultSignature,
  deleteMySignature,
  setDefaultSignature,
  verifyPin,
  updatePin,
  forceRehashPin,
  insertSignatureToPdf,
};
