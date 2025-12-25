const { catchAsync, response, n8nClient, constants } = require('../../common');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ExifTool } = require("exiftool-vendored");
const exiftool = new ExifTool();
const axios = require('axios');

const { supabaseAdmin } = require('../../config/supabase');
const { ApiError, httpStatus } = require('../../common');

/**
 * Get all documents for current user (from documents table)
 */
const getUserDocuments = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('owner_id', ownerId)
    .neq('status', 'deleted')
    .order('update_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lấy danh sách tài liệu');
  }

  // Filter out deleted documents (double check)
  const filteredData = (data || []).filter(doc => doc.status !== 'deleted');

  console.log(`[getUserDocuments] Found ${filteredData?.length || 0} documents for owner ${ownerId}`, filteredData?.map(d => ({ id: d.id, title: d.title, status: d.status })));
  return response.success(res, { documents: filteredData }, 'Lấy danh sách tài liệu thành công');
});

/**
 * Search documents by title or description
 */
const searchDocuments = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;
  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return response.success(res, { documents: [] }, 'Tìm kiếm thành công');
  }

  const searchTerm = q.trim();
  const searchPattern = `%${searchTerm}%`;

  // Tìm kiếm trong title hoặc description
  // Supabase PostgREST syntax: or('column1.ilike.value1,column2.ilike.value2')
  // Note: % needs to be URL encoded or passed as part of the pattern
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('owner_id', ownerId)
    .neq('status', 'deleted')
    .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
    .order('update_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error searching documents:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi tìm kiếm tài liệu');
  }

  console.log(`[searchDocuments] Found ${data?.length || 0} documents for search: "${searchTerm}"`);
  return response.success(res, { documents: data || [] }, 'Tìm kiếm thành công');
});

/**
 * Get documents by category (based on storage_path prefix)
 */
const getDocumentsByCategory = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;
  const { category } = req.query;

  if (!category) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category is required');
  }

  // Map category name to path prefix
  const categoryMap = {
    'hop-dong-phap-ly': 'Legal & Contracts',
    'tai-chinh-ke-toan': 'Finance & Tax',
    'nhan-su-hanh-chinh': 'HR & Admin',
    'kinh-doanh-khach-hang': 'Sales & CRM',
    'du-an-ky-thuat': 'Projects & Tech',
    'marketing-truyen-thong': 'Marketing',
    'khac': 'Other',
  };

  const pathPrefix = categoryMap[category] || category;

  let query = supabaseAdmin
    .from('documents')
    .select('*')
    .eq('owner_id', ownerId);

  if (pathPrefix === 'Other') {
    // Lấy tất cả documents không match với các category trên
    const excludePrefixes = ['Legal & Contracts', 'Finance & Tax', 'HR & Admin', 'Sales & CRM', 'Projects & Tech', 'Marketing'];
    // Sử dụng NOT và ilike để loại trừ - cần escape special characters
    excludePrefixes.forEach((prefix) => {
      // Escape & thành %26 cho URL encoding hoặc dùng ilike với pattern
      const escapedPrefix = prefix.replace(/&/g, '&');
      query = query.not('storage_path', 'ilike', `${escapedPrefix}/%`);
    });
  } else {
    // Tìm documents có storage_path bắt đầu với path prefix
    // Escape & nếu có trong prefix
    const escapedPrefix = pathPrefix.replace(/&/g, '&');
    query = query.ilike('storage_path', `${escapedPrefix}/%`);
  }

  const { data, error } = await query.order('update_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents by category:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lấy tài liệu theo danh mục');
  }

  // Filter out deleted documents
  const filteredData = (data || []).filter(doc => doc.status !== 'deleted');

  return response.success(res, { documents: filteredData }, 'Lấy tài liệu theo danh mục thành công');
});

/**
 * Get folder statistics (count documents by category)
 */
const getFolderStats = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;

  // Lấy tất cả documents của user (không bao gồm deleted)
  const { data: allDocuments, error } = await supabaseAdmin
    .from('documents')
    .select('storage_path, status')
    .eq('owner_id', ownerId)
    .neq('status', 'deleted');

  if (error) {
    console.error('Error fetching documents for folder stats:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lấy thống kê thư mục');
  }

  // Map path prefix to category
  const categoryCounts = {
    'hop-dong-phap-ly': 0,
    'tai-chinh-ke-toan': 0,
    'nhan-su-hanh-chinh': 0,
    'kinh-doanh-khach-hang': 0,
    'du-an-ky-thuat': 0,
    'marketing-truyen-thong': 0,
    'khac': 0,
  };

  const pathPrefixMap = {
    'Legal & Contracts': 'hop-dong-phap-ly',
    'Finance & Tax': 'tai-chinh-ke-toan',
    'HR & Admin': 'nhan-su-hanh-chinh',
    'Sales & CRM': 'kinh-doanh-khach-hang',
    'Projects & Tech': 'du-an-ky-thuat',
    'Marketing': 'marketing-truyen-thong',
  };

  // Đếm documents theo category
  (allDocuments || []).forEach((doc) => {
    if (!doc.storage_path) {
      categoryCounts['khac']++;
      return;
    }

    // Extract path prefix (first part before /)
    const pathParts = doc.storage_path.split('/');
    const firstPart = pathParts[0] || '';
    
    let matched = false;
    for (const [prefix, categoryKey] of Object.entries(pathPrefixMap)) {
      // Check if storage_path starts with prefix (case-insensitive)
      if (firstPart.toLowerCase() === prefix.toLowerCase() || 
          doc.storage_path.toLowerCase().startsWith(prefix.toLowerCase() + '/')) {
        categoryCounts[categoryKey]++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      categoryCounts['khac']++;
    }
  });

  return response.success(res, categoryCounts, 'Lấy thống kê thư mục thành công');
});

/**
 * Get dashboard statistics
 */
const getDashboardStats = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Tài liệu mới trong tuần (created_at trong 7 ngày qua) - không bao gồm deleted
  const { count: newDocsCount, error: newDocsError } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .neq('status', 'deleted')
    .gte('created_at', oneWeekAgo.toISOString());

  // 2. Tài liệu đang chờ ký duyệt (status = 'CHOKY') - không bao gồm deleted
  const { count: pendingDocsCount, error: pendingDocsError } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('status', 'CHOKY');

  // 3. Tài liệu có rủi ro (sensitivity_level = CONFIDENTIAL hoặc RESTRICTED) - không bao gồm deleted
  const { count: riskDocsCount, error: riskDocsError } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .neq('status', 'deleted')
    .in('sensitivity_level', ['CONFIDENTIAL', 'RESTRICTED']);

  // 4. Tài liệu chưa xử lý (processing != 'done') - tổng số - không bao gồm deleted
  const { count: unprocessedDocsCount, error: unprocessedDocsError } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .neq('status', 'deleted')
    .neq('processing', 'done');

  if (newDocsError || pendingDocsError || riskDocsError || unprocessedDocsError) {
    console.error('Error fetching dashboard stats:', {
      newDocsError,
      pendingDocsError,
      riskDocsError,
      unprocessedDocsError,
    });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lấy thống kê');
  }

  return response.success(
    res,
    {
      newDocumentsThisWeek: newDocsCount || 0,
      pendingApproval: pendingDocsCount || 0,
      riskDocuments: riskDocsCount || 0,
      unprocessedDocuments: unprocessedDocsCount || 0,
    },
    'Lấy thống kê thành công'
  );
});

/**
 * Get all documents (via n8n)

 */
const getDocuments = catchAsync(async (req, res) => {
  // Trigger n8n webhook để lấy documents
  const result = await n8nClient.triggerWebhook('documents/list', req.query, 'POST');
  return response.success(res, result, 'Documents retrieved successfully');
});

/**
 * Get single document
 */
const getDocument = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await n8nClient.triggerWebhook('documents/get', { id });
  return response.success(res, result, 'Document retrieved successfully');
});

/**
 * Create document
 */
const createDocument = catchAsync(async (req, res) => {
  const result = await n8nClient.triggerWebhook('documents/create', req.body);
  return response.created(res, result, 'Document created successfully');
});

/**
 * Update document
 */
const updateDocument = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await n8nClient.triggerWebhook('documents/update', { id, ...req.body });
  return response.success(res, result, 'Document updated successfully');
});

/**

 * Delete document (soft delete - update status to deleted)
 */
const deleteDocument = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const { id } = req.params;
  const ownerId = req.user.id;

  // Kiểm tra document tồn tại và thuộc về user
  const { data: document, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('id, owner_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  if (document.owner_id !== ownerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this document');
  }

  // Update status to deleted (soft delete)
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('documents')
    .update({ status: 'deleted', update_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error deleting document:', updateError);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete document');
  }

  return response.success(res, updated, 'Document deleted successfully');
});

/**
 * Delete document (via n8n - old method)
 */
const deleteDocumentN8n = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await n8nClient.triggerWebhook('documents/delete', { id });
  return response.success(res, result, 'Document deleted successfully');
});




/**
 * Upload documents to polling queue
 * POST /documents/upload-to-queue
 * Content-Type: multipart/form-data
 * Body: files[] (multiple files)
 */
const uploadDocumentsToQueue = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  // Kiểm tra có files được upload không
  if (!req.files || req.files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Vui lòng chọn ít nhất một file');
  }

  const ownerId = req.user.id;
  const uploadedFiles = [];
  const errors = [];

  // Ensure user profile exists (required for foreign key constraint)
  try {
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', ownerId)
      .single();

    if (!existingProfile) {
      console.log('Creating user profile for:', ownerId);
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: ownerId,
          email: req.user.email,
          role: 'user'
        });

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create user profile');
      }
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Error checking user profile:', error);
  }

  // Bucket name - đã có sẵn
  const bucketName = 'polling_queue';
  
  // Kiểm tra bucket có tồn tại không
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
    } else {
      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      console.log(`Available buckets:`, buckets.map(b => b.name));
      console.log(`Looking for bucket: ${bucketName}, Found: ${bucketExists}`);
      
      if (!bucketExists) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Bucket "${bucketName}" không tồn tại. Vui lòng kiểm tra tên bucket trong Supabase Dashboard > Storage.`
        );
      }
    }
  } catch (bucketCheckError) {
    if (bucketCheckError instanceof ApiError) {
      throw bucketCheckError;
    }
    console.error('Error checking bucket:', bucketCheckError);
  }

  // Hàm encode tên file để an toàn với storage (chuyển tiếng Việt sang không dấu)
  const encodeFileName = (filename) => {
    // Chuyển tiếng Việt sang không dấu và loại bỏ ký tự đặc biệt
    const normalized = filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu tiếng Việt
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Thay ký tự đặc biệt bằng underscore (giữ lại dấu chấm cho extension)
      .replace(/_+/g, '_') // Loại bỏ underscore liên tiếp
      .replace(/^_|_$/g, ''); // Loại bỏ underscore đầu/cuối
    
    return normalized || 'file';
  };

  // Xử lý từng file
  for (const file of req.files) {
    try {
      // Tạo tên file unique và encode an toàn
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      
      // Lấy extension từ tên file gốc
      const fileExtension = file.originalname.split('.').pop() || 'bin';
      
      // Encode tên file gốc (loại bỏ tiếng Việt và ký tự đặc biệt)
      // Lấy tên file không có extension để encode
      const nameWithoutExt = file.originalname.substring(0, file.originalname.lastIndexOf('.')) || file.originalname;
      const safeFileName = encodeFileName(nameWithoutExt);
      
      const uniqueFileName = `${ownerId}/${timestamp}-${randomStr}-${safeFileName}.${fileExtension}`;
      const filePath = uniqueFileName;

      // Upload lên Supabase Storage bucket polling_queue
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        // Nếu lỗi là bucket not found, thử tạo lại
        if (uploadError.message && uploadError.message.includes('not found')) {
          errors.push({
            fileName: file.originalname,
            error: `Bucket "${bucketName}" không tồn tại. Vui lòng tạo bucket này trong Supabase Dashboard > Storage.`,
          });
        } else {
          errors.push({
            fileName: file.originalname,
            error: `Failed to upload: ${uploadError.message}`,
          });
        }
        continue;
      }

      // Lưu thông tin vào bảng document_polling_queue
      const { data: dbData, error: dbError } = await supabaseAdmin
        .from('document_polling_queue')
        .insert({
          owner_id: ownerId,
          name_document: file.originalname,
          file_path: filePath,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Nếu insert DB fail, xóa file đã upload
        await supabaseAdmin.storage
          .from(bucketName)
          .remove([filePath])
          .catch(() => {});
        errors.push({
          fileName: file.originalname,
          error: `Failed to save to database: ${dbError.message}`,
        });
        continue;
      }

      uploadedFiles.push({
        id: dbData.id,
        name: file.originalname,
        file_path: filePath,
        size: file.size,
        mime_type: file.mimetype,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      errors.push({
        fileName: file.originalname,
        error: error.message || 'Unknown error',
      });
    }
  }

  // Trả về kết quả
  if (uploadedFiles.length === 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Tất cả file đều upload thất bại',
      { errors }
    );
  }

  return response.success(
    res,
    {
      uploaded: uploadedFiles,
      failed: errors.length > 0 ? errors : undefined,
      total: req.files.length,
      success: uploadedFiles.length,
    },
    `Đã upload thành công ${uploadedFiles.length}/${req.files.length} file`
  );
});

/**
 * Get user notifications
 */
const getNotifications = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;
  console.log(`[getNotifications] Request from user ID: ${ownerId}`);

  // Lấy tất cả notifications trước để debug
  const { data: allNotifications, error: allError } = await supabaseAdmin
    .from('notification')
    .select('*')
    .order('created_at', { ascending: false });
  
  console.log(`[getNotifications] All notifications in DB:`, allNotifications?.length || 0);
  if (allNotifications && allNotifications.length > 0) {
    console.log(`[getNotifications] Sample owner_ids:`, allNotifications.slice(0, 3).map(n => ({ id: n.id, owner_id: n.owner_id })));
  }

  // Lấy notifications của user
  const { data, error } = await supabaseAdmin
    .from('notification')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lấy thông báo');
  }

  console.log(`[getNotifications] Found ${data?.length || 0} notifications for owner ${ownerId}`);
  if (data && data.length > 0) {
    console.log(`[getNotifications] Notifications:`, data.map(n => ({ id: n.id, notification: n.notification?.substring(0, 50), processing: n.processing })));
  } else {
    console.log(`[getNotifications] No notifications found for owner ${ownerId}. Checking if owner_id matches...`);
  }
  
  return response.success(res, { notifications: data || [] }, 'Lấy thông báo thành công');
});

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;

  const { data, error } = await supabaseAdmin
    .from('notification')
    .update({ processing: 'done' })
    .eq('owner_id', ownerId)
    .eq('processing', 'sent')
    .select();

  if (error) {
    console.error('Error updating notifications:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi cập nhật thông báo');
  }

  return response.success(res, { notifications: data || [] }, 'Đã đánh dấu tất cả thông báo là đã đọc');
});



/**
 * HÀM BỔ TRỢ: Tự động trích xuất ngày tạo gốc từ mọi loại file
 */
const extractCreationDate = async (fileBuffer, originalName) => {
  const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}_${originalName}`);
  
  try {
    await fs.promises.writeFile(tempFilePath, fileBuffer);
    const tags = await exiftool.read(tempFilePath);
    const dateValue = tags.CreateDate || tags.DateTimeOriginal || tags.ContentCreated || tags.ModifyDate;

    if (dateValue && dateValue.toDate) {
      return dateValue.toDate();
    } else if (typeof dateValue === 'string') {
        return new Date(dateValue);
    }
    
    return new Date(); 
  } catch (error) {
    console.error("⚠️ Lỗi đọc Metadata:", error.message);
    return new Date(); 
  } finally {
    try {
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    } catch (e) { }
  }
};

/**
 * 1. DOWNLOAD DOCUMENT (Secure Version)
 */
const requestDownloadUrl = catchAsync(async (req, res) => {
  const { documentId, userId } = req.body; // or req.user.id if authenticated

  const finalUserId = userId || (req.user ? req.user.id : null);

  if (!documentId || !finalUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Thiếu thông tin: documentId hoặc userId');
  }

  // Tra cứu Database
  const { data: docInfo, error: dbError } = await supabaseAdmin
    .from('documents')
    .select('storage_path, title')
    .eq('id', documentId)
    .single();

  if (dbError || !docInfo) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy file trong hệ thống.');
  }

  // Ghi Log Audit
  await supabaseAdmin.from('audit_logs').insert([{
    user_id: finalUserId,
    action: 'download',
    resource_type: 'documents',
    resource_id: documentId,
    details: { filename: docInfo.title },
    ip_address: req.ip,
    created_at: new Date().toISOString()
  }]);

  // Tạo Signed URL
  const { data, error: storageError } = await supabaseAdmin.storage
    .from('documents')
    .createSignedUrl(docInfo.storage_path, 60);

  if (storageError || !data) {
    throw new ApiError(httpStatus.NOT_FOUND, 'File vật lý không tồn tại trên Storage.');
  }

  return response.success(res, { downloadUrl: data.signedUrl }, 'Tạo link download thành công');
});

/**
 * 2. UPLOAD DOCUMENT (Smart Agent Version)
 */
const uploadDocumentSmart = catchAsync(async (req, res) => {
  const file = req.file; // From multer single('file')
  const { userId } = req.body;
  const finalUserId = userId || (req.user ? req.user.id : null);

  if (!file || !finalUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Thiếu file hoặc userId');
  }

  console.log(`📂 Đang phân tích metadata file: ${file.originalname}...`);
  const detectedDate = await extractCreationDate(file.buffer, file.originalname);
  console.log(`📅 Ngày gốc tìm thấy: ${detectedDate.toISOString()}`);

  // Call N8N
  let n8nResult = { is_old: false };
  try {
    // Assuming n8nClient can handle this path or we use basic axios if it expects full url
    // For safety, let's use n8nClient.triggerWebhook if we know the path suffix 'webhook/check-date' maps correctly.
    // Or we use the exact path from audit-tracking-main if it's external.
    // If n8nClient.triggerWebhook uses POST by default:
    const result = await n8nClient.triggerWebhook('webhook/check-date', {
       dateToCheck: detectedDate.toISOString()
    });
    // If result contains the data directly
    n8nResult = result || { is_old: false };
    console.log(`🤖 n8n phản hồi: ${JSON.stringify(n8nResult)}`);
  } catch (error) {
    console.error("⚠️ Không gọi được n8n hoặc lỗi:", error.message); 
    // Fallback to new
  }

  // Upload to Storage
  const storagePath = `uploads/${finalUserId}/${Date.now()}_${file.originalname}`;
  
  const { error: storageError } = await supabaseAdmin.storage
    .from('documents')
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (storageError) {
    console.error("Upload Storage Error:", storageError);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lưu file lên Storage.');
  }

  // Save to DB
  const { data: dbData, error: dbError } = await supabaseAdmin
    .from('documents')
    .insert([{
      owner_id: finalUserId,
      title: file.originalname,
      storage_path: storagePath,
      mime_type: file.mimetype,
      document_date: detectedDate,
      status: n8nResult.is_old ? 'archived' : 'uploaded',
      ai_analysis_result: n8nResult.is_old 
          ? `⚠️ Tài liệu cũ (Ngày: ${detectedDate.toISOString().split('T')[0]}). Đã lưu kho.` 
          : '✅ Tài liệu mới.'
    }])
    .select()
    .single();

  if (dbError) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lưu thông tin vào Database.');
  }

  return response.created(res, dbData, 'Upload và kiểm tra thành công');
});

// Clean up exiftool on exit
process.on("exit", () => exiftool.end());

module.exports = {
  getUserDocuments,
  getDashboardStats,
  searchDocuments,
  getDocumentsByCategory,
  getFolderStats,
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentsToQueue,
  getNotifications,
  markAllNotificationsAsRead,
  requestDownloadUrl,
  uploadDocumentSmart,
};
