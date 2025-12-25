const { catchAsync, response } = require('../../common');
const { supabaseAdmin } = require('../../config/supabase');
const { ApiError, httpStatus } = require('../../common');

// 7 phòng ban mặc định - KHÔNG ĐỔI
const DEFAULT_DEPARTMENTS = [
  { category_key: 'Finance & Tax', department_name: 'Phòng Tài chính - Kế toán' },
  { category_key: 'Legal & Contracts', department_name: 'Phòng Pháp chế' },
  { category_key: 'HR & Admin', department_name: 'Phòng Hành chính - Nhân sự' },
  { category_key: 'Sales & CRM', department_name: 'Phòng Kinh doanh' },
  { category_key: 'Projects & Tech', department_name: 'Phòng Kỹ thuật & Dự án' },
  { category_key: 'Marketing', department_name: 'Phòng Marketing' },
  { category_key: 'Other', department_name: 'Bộ phận Quản lý chung' },
];

/**
 * Get department configs for current user
 * GET /department-configs
 */
const getDepartmentConfigs = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;
  console.log('GET departments for owner:', ownerId);

  const { data, error } = await supabaseAdmin
    .from('department_configs')
    .select('*')
    .eq('owner_id', ownerId)
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching department configs:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lấy danh sách phòng ban');
  }

  console.log('Found', data?.length || 0, 'departments');
  return response.success(res, { departments: data || [] }, 'Lấy danh sách phòng ban thành công');
});

/**
 * Create or update department configs for user
 * POST /department-configs
 * Body: { departments: [{ category_key, department_name, notification_email }] }
 */
const updateDepartmentConfigs = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;
  const { departments } = req.body;

  console.log('=== POST Department Configs ===');
  console.log('Owner ID:', ownerId);
  console.log('Input departments:', departments?.length);

  if (!departments || !Array.isArray(departments) || departments.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Danh sách phòng ban không hợp lệ');
  }

  // Bước 1: Kiểm tra user đã có departments chưa
  const { data: existingDepts, error: checkError } = await supabaseAdmin
    .from('department_configs')
    .select('id, category_key, notification_email')
    .eq('owner_id', ownerId);

  if (checkError) {
    console.error('Check error:', checkError);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi kiểm tra dữ liệu');
  }

  const existingCount = existingDepts?.length || 0;
  console.log('Existing departments count:', existingCount);

  // Bước 2: Xử lý theo trường hợp
  if (existingCount === 0) {
    // === TRƯỜNG HỢP 1: User CHƯA có data -> INSERT 7 phòng ban ===
    console.log('>>> INSERT 7 phòng ban mới cho user');

    // Tạo data từ input (lấy email user nhập) + default departments
    const insertData = DEFAULT_DEPARTMENTS.map(defaultDept => {
      // Tìm email user đã nhập cho phòng ban này
      const userInput = departments.find(d => d.category_key === defaultDept.category_key);
      return {
        owner_id: ownerId,
        category_key: defaultDept.category_key,
        department_name: defaultDept.department_name,
        notification_email: userInput?.notification_email || null,
      };
    });

    console.log('Insert data:', JSON.stringify(insertData, null, 2));

    // Insert từng cái một để tránh lỗi batch
    const results = [];
    const errors = [];

    for (const dept of insertData) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('department_configs')
        .insert(dept)
        .select()
        .single();

      if (insertError) {
        console.error('Insert error for', dept.category_key, ':', insertError.message);
        errors.push({ category_key: dept.category_key, error: insertError.message });
      } else {
        console.log('Inserted:', dept.category_key);
        results.push(inserted);
      }
    }

    if (results.length === 0) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Không thể tạo phòng ban: ${errors[0]?.error}`);
    }

    return response.success(res, {
      action: 'insert',
      updated: results,
      failed: errors.length > 0 ? errors : undefined,
      total: 7,
      success: results.length,
    }, `Đã tạo ${results.length}/7 phòng ban`);

  } else {
    // === TRƯỜNG HỢP 2: User ĐÃ có data -> UPDATE email ===
    console.log('>>> UPDATE email cho phòng ban đã có');

    const results = [];
    const errors = [];

    for (const inputDept of departments) {
      const existing = existingDepts.find(e => e.category_key === inputDept.category_key);

      if (existing) {
        // Update email
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('department_configs')
          .update({ notification_email: inputDept.notification_email || null })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('Update error:', updateError.message);
          errors.push({ category_key: inputDept.category_key, error: updateError.message });
        } else {
          results.push(updated);
        }
      }
    }

    return response.success(res, {
      action: 'update',
      updated: results,
      failed: errors.length > 0 ? errors : undefined,
      total: departments.length,
      success: results.length,
    }, `Đã cập nhật ${results.length} phòng ban`);
  }
});

module.exports = {
  getDepartmentConfigs,
  updateDepartmentConfigs,
};

