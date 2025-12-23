const { catchAsync, response, n8nClient } = require('../../common');

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
    .order('updated_at', { ascending: false })
    .limit(5);

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
    .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
    .order('updated_at', { ascending: false })
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

  const { data, error } = await query.order('updated_at', { ascending: false });

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
    .update({ status: 'deleted', updated_at: new Date().toISOString() })
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

};
