const { catchAsync, response } = require('../../common');
const { supabaseAdmin } = require('../../config/supabase');
const { ApiError, httpStatus } = require('../../common');

/**
 * Get department configs for current user
 * GET /department-configs
 */
const getDepartmentConfigs = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;

  const { data, error } = await supabaseAdmin
    .from('department_configs')
    .select('*')
    .eq('owner_id', ownerId)
    .order('department_name', { ascending: true });

  if (error) {
    console.error('Error fetching department configs:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lấy danh sách phòng ban');
  }

  return response.success(res, { departments: data || [] }, 'Lấy danh sách phòng ban thành công');
});

/**
 * Update or create department configs
 * POST /department-configs
 * Body: { departments: [{ department_name, category_key, notification_email }] }
 */
const updateDepartmentConfigs = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const ownerId = req.user.id;
  const { departments } = req.body;

  console.log('Update department configs request:', {
    ownerId,
    departmentsCount: departments?.length,
    departments: departments,
  });

  if (!departments || !Array.isArray(departments)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Danh sách phòng ban không hợp lệ');
  }

  const results = [];
  const errors = [];

  for (const dept of departments) {
    console.log('Processing department:', dept);
    try {
      const { department_name, category_key, notification_email } = dept;

      if (!department_name || !category_key) {
        errors.push({
          department_name: department_name || 'N/A',
          error: 'department_name và category_key là bắt buộc',
        });
        continue;
      }

      // Nếu có id, update; nếu không có, insert
      if (dept.id) {
        console.log(`Updating department ${department_name} with id ${dept.id}`);
        // Update existing record - dùng maybeSingle để tránh lỗi khi không tìm thấy
        const updatePayload = {
          notification_email: notification_email || null,
        };
        // Chỉ thêm updated_at nếu column tồn tại (database sẽ tự động set nếu có trigger)
        
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('department_configs')
          .update(updatePayload)
          .eq('id', dept.id)
          .eq('owner_id', ownerId) // Đảm bảo chỉ update của chính user này
          .select()
          .maybeSingle();

        if (updateError) {
          console.error('Update error for', department_name, ':', updateError);
          errors.push({
            department_name,
            error: updateError.message || 'Lỗi khi cập nhật',
          });
        } else if (updateData) {
          console.log('Successfully updated:', updateData);
          results.push(updateData);
        } else {
          // Không tìm thấy record để update - có thể id không đúng hoặc không thuộc về user này
          console.error(`No record found to update for id ${dept.id}, department: ${department_name}`);
          errors.push({
            department_name,
            error: 'Không tìm thấy bản ghi để cập nhật. Có thể ID không đúng hoặc không thuộc về tài khoản của bạn.',
          });
        }
      } else {
        console.log(`Inserting new department ${department_name} with category ${category_key}`);
        // Insert new record (chỉ khi chưa có id)
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('department_configs')
          .insert({
            owner_id: ownerId,
            department_name,
            category_key,
            notification_email: notification_email || null,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error for', department_name, ':', insertError);
          errors.push({
            department_name,
            error: insertError.message || 'Lỗi khi tạo mới',
          });
        } else if (insertData) {
          console.log('Successfully inserted:', insertData);
          results.push(insertData);
        } else {
          console.error('Insert returned no data for', department_name);
          errors.push({
            department_name,
            error: 'Không thể tạo bản ghi mới',
          });
        }
      }

    } catch (error) {
      console.error('Error processing department:', error);
      errors.push({
        department_name: dept.department_name || 'N/A',
        error: error.message || 'Unknown error',
      });
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Không thể cập nhật phòng ban',
      { errors }
    );
  }

  return response.success(
    res,
    {
      updated: results,
      failed: errors.length > 0 ? errors : undefined,
      total: departments.length,
      success: results.length,
    },
    `Đã cập nhật ${results.length}/${departments.length} phòng ban`
  );
});

module.exports = {
  getDepartmentConfigs,
  updateDepartmentConfigs,
};

