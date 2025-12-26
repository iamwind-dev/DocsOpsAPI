const { supabaseAdmin } = require('../config/supabase');
const { ApiError, httpStatus } = require('../common');

const checkBlockStatus = async (req, res, next) => {
  try {
    // 1. Lấy ID user từ request
    const userId = req.body.userId || req.user?.id || req.query.userId;

    if (!userId) {
      return next(); 
    }

    // 2. Tra cứu trạng thái trong Database
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('is_blocked, full_name')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      return next();
    }

    // 3. KIỂM TRA QUAN TRỌNG
    if (profile.is_blocked === 1) {
      console.warn(`⛔ CẢNH BÁO: User ${profile.full_name} đang cố thao tác nhưng đã bị CHẶN.`);
      
      // Using standard response format if possible, or just res.status
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa do phát hiện hành vi bất thường. Vui lòng liên hệ Admin.'
      });
    }

    // 4. Nếu is_blocked = 0 -> Cho qua
    next();

  } catch (err) {
    console.error("Lỗi checkBlockStatus:", err);
    next(err);
  }
};

module.exports = checkBlockStatus;
