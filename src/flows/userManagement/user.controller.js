const { catchAsync, response, httpStatus, ApiError } = require('../../common');
const { supabaseAdmin } = require('../../config/supabase'); // Use admin client for DB
const logger = require('../../config/logger'); // If available, else remove

/**
 * POST /api/admin/block-user
 * Body: { userId: "...", status: 1 } HOẶC { email: "...", status: 1 }
 */
const toggleBlockUser = catchAsync(async (req, res) => {
  // Lấy dữ liệu từ body
  let { userId, email, status } = req.body;

  // Mặc định status = 1 (Block) nếu không gửi lên
  if (status === undefined) status = 1;

  // --- TRƯỜNG HỢP 1: Nếu chỉ có Email (từ AI gửi về) ---
  if (!userId && email) {
    console.log(`🔍 Đang tìm userId cho email: ${email}`);
    
    // Tìm user_id trong bảng user_profiles dựa vào email
    const { data: userFound, error: findError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('email', email) // Đảm bảo bảng user_profiles có cột 'email'
      .single();
      
    if (findError || !userFound) {
      throw new ApiError(httpStatus.NOT_FOUND, `Không tìm thấy user nào có email: ${email}`);
    }
    
    userId = userFound.user_id;
    console.log(`✅ Đã tìm thấy userId: ${userId}`);
  }

  // Nếu vẫn không có userId sau khi tìm
  if (!userId) {
     throw new ApiError(httpStatus.BAD_REQUEST, 'Yêu cầu phải có userId hoặc email hợp lệ.');
  }

  // --- THỰC HIỆN UPDATE TRẠNG THÁI ---
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .update({ is_blocked: status })
    .eq('user_id', userId)
    .select();

  if (error) {
      throw new Error(error.message);
  }

  return response.success(
      res, 
      { data }, 
      `Đã cập nhật trạng thái chặn (is_blocked=${status}) cho user: ${email || userId}`
  );
});

/**
 * GET /api/users/:id/status
 */
const getUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('is_blocked')
    .eq('user_id', id)
    .single();

  // Nếu không tìm thấy user, coi như không bị block (an toàn)
  if (error || !data) {
     return response.success(res, { is_blocked: 0 }, 'User not found or status ok');
  }

  return response.success(res, data, 'Success');
});

module.exports = {
  toggleBlockUser,
  getUserStatus
};
