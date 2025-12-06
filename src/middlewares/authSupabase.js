/**
 * Supabase Authentication Middleware
 * 
 * Middleware này xác thực JWT access token từ frontend.
 * 
 * Flow:
 * 1. Frontend login qua Supabase Auth → nhận access_token
 * 2. Frontend gửi request với header: Authorization: Bearer <access_token>
 * 3. Middleware này verify token và attach user info vào req.user
 * 
 * LƯU Ý:
 * - Sử dụng supabaseAuth (anon key) để verify token
 * - Không sử dụng service role key ở đây vì chỉ cần verify, không cần bypass RLS
 */

const { supabaseAuth } = require('../config/supabase');
const { ApiError, httpStatus } = require('../common');

/**
 * Middleware xác thực Supabase JWT
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object  
 * @param {NextFunction} next - Express next function
 */
const authSupabase = async (req, res, next) => {
  try {
    // Lấy token từ Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Authorization header is required');
    }

    // Kiểm tra format Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid authorization format. Use: Bearer <token>');
    }

    const accessToken = authHeader.substring(7); // Bỏ "Bearer " prefix

    if (!accessToken) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Access token is required');
    }

    // Verify token với Supabase Auth
    // getUser() sẽ validate token và trả về user info nếu valid
    const { data: { user }, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error) {
      // Token không hợp lệ hoặc đã hết hạn
      console.error('Supabase auth error:', error.message);
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired access token');
    }

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found');
    }

    // Attach user info vào request để sử dụng trong controllers
    // user object chứa: id, email, user_metadata, app_metadata, etc.
    req.user = user;
    
    // Lưu access token để có thể dùng cho các request tiếp theo nếu cần
    req.accessToken = accessToken;

    next();
  } catch (error) {
    // Nếu là ApiError thì forward, nếu không thì wrap lại
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication failed'));
    }
  }
};

/**
 * Optional auth middleware - không bắt buộc có token
 * Nếu có token thì verify, không có thì cho qua
 * Hữu ích cho các endpoint public nhưng có thêm features cho authenticated users
 */
const optionalAuthSupabase = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Không có token, cho qua nhưng không set req.user
      return next();
    }

    const accessToken = authHeader.substring(7);
    
    if (!accessToken) {
      return next();
    }

    const { data: { user }, error } = await supabaseAuth.auth.getUser(accessToken);

    if (!error && user) {
      req.user = user;
      req.accessToken = accessToken;
    }

    next();
  } catch (error) {
    // Lỗi xảy ra nhưng vì là optional nên cho qua
    next();
  }
};

module.exports = {
  authSupabase,
  optionalAuthSupabase,
};
