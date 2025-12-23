const { catchAsync, response } = require('../../common');
const { supabaseAdmin, supabaseAuth } = require('../../config/supabase');
const { ApiError, httpStatus } = require('../../common');

/**
 * Đăng ký tài khoản mới
 * POST /auth/register
 */
const register = catchAsync(async (req, res) => {
  const { email, password, full_name, company_name } = req.body;

  if (!email || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email và password là bắt buộc');
  }

  if (password.length < 6) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mật khẩu phải có ít nhất 6 ký tự');
  }

  // Tạo user trong Supabase Auth (dùng admin để tự động confirm email)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Tự động confirm email
    user_metadata: {
      full_name: full_name || '',
      company_name: company_name || '',
    },
  });

  if (authError) {
    throw new ApiError(httpStatus.BAD_REQUEST, authError.message);
  }

  // Tạo hoặc cập nhật user_profiles với thông tin đầy đủ
  let userProfile = null;
  if (authData.user) {
    // Đợi một chút để database trigger chạy xong (nếu có)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Kiểm tra xem profile đã tồn tại chưa (có thể do trigger tạo)
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (existingProfile) {
      // Profile đã tồn tại, cập nhật thông tin
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          email: authData.user.email,
          full_name: full_name || existingProfile.full_name || null,
          company_name: company_name || existingProfile.company_name || null,
          role: existingProfile.role || 'user', // Giữ role hiện tại nếu có
        })
        .eq('user_id', authData.user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user profile:', updateError);
      } else {
        userProfile = updatedProfile;
        console.log('✅ User profile updated successfully:', updatedProfile);
      }
    } else {
      // Profile chưa tồn tại, tạo mới
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          email: authData.user.email,
          full_name: full_name || null,
          company_name: company_name || null,
          role: 'user',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting user profile:', insertError);
        // Không throw error vì user đã được tạo, chỉ log để debug
      } else {
        userProfile = newProfile;
        console.log('✅ User profile created successfully:', newProfile);
      }
    }
  }

  // Tạo session bằng cách sign in (dùng supabaseAuth thay vì supabaseAdmin)
  const { data: sessionData, error: sessionError } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError) {
    console.error('❌ Error creating session:', sessionError);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Lỗi khi tạo session: ${sessionError.message}`);
  }

  if (!sessionData || !sessionData.session) {
    console.error('❌ Session data is null or missing session');
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Không thể tạo session. Vui lòng thử lại.');
  }

  // Đảm bảo session có đầy đủ thông tin
  if (!sessionData.session.access_token || !sessionData.session.refresh_token) {
    console.error('❌ Session missing required tokens');
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Session không hợp lệ');
  }

  console.log('✅ Registration successful for user:', authData.user.email);
  console.log('✅ Profile:', userProfile ? 'Created' : 'Not created (will be created by trigger)');

  return response.created(res, {
    user: {
      id: authData.user.id,
      email: authData.user.email,
      user_metadata: authData.user.user_metadata,
    },
    profile: userProfile, // Trả về profile để frontend có thể dùng ngay
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
    },
  }, 'Đăng ký thành công');
});

/**
 * Đăng nhập
 * POST /auth/login
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email và password là bắt buộc');
  }

  // Đăng nhập với Supabase Auth
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, error.message || 'Email hoặc mật khẩu không đúng');
  }

  // Lấy user profile
  let userProfile = null;
  if (data.user) {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = not found, đó là OK nếu profile chưa có
      console.error('Error fetching user profile:', profileError);
    } else if (profileError && profileError.code === 'PGRST116') {
      // Profile chưa tồn tại, tạo mới
      console.log('Profile not found, creating new profile for user:', data.user.id);
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || null,
          company_name: data.user.user_metadata?.company_name || null,
          role: 'user',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
      } else {
        console.log('✅ User profile created during login');
        userProfile = newProfile;
      }
    } else {
      userProfile = profileData;
      console.log('✅ User profile found:', userProfile);
    }
  }

  return response.success(res, {
    user: {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    },
    profile: userProfile,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  }, 'Đăng nhập thành công');
});

/**
 * Lấy thông tin user hiện tại
 * GET /auth/me
 */
const getMe = catchAsync(async (req, res) => {
  // req.user được set bởi authSupabase middleware
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Không tìm thấy thông tin user');
  }

  // Lấy user profile
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error fetching profile in getMe:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Lỗi khi lấy thông tin profile');
  }

  // Nếu profile chưa có, tạo mới
  if (error && error.code === 'PGRST116') {
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: req.user.id,
        email: req.user.email,
        full_name: req.user.user_metadata?.full_name || null,
        company_name: req.user.user_metadata?.company_name || null,
        role: 'user',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile in getMe:', createError);
      return response.success(res, {
        user: {
          id: req.user.id,
          email: req.user.email,
          user_metadata: req.user.user_metadata,
        },
        profile: null,
      }, 'Lấy thông tin user thành công (profile chưa có)');
    } else {
      return response.success(res, {
        user: {
          id: req.user.id,
          email: req.user.email,
          user_metadata: req.user.user_metadata,
        },
        profile: newProfile,
      }, 'Lấy thông tin user thành công');
    }
  }

  return response.success(res, {
    user: {
      id: req.user.id,
      email: req.user.email,
      user_metadata: req.user.user_metadata,
    },
    profile: profile || null,
  }, 'Lấy thông tin user thành công');
});

/**
 * Đăng xuất
 * POST /auth/logout
 */
const logout = catchAsync(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Revoke session (optional - Supabase sẽ tự động expire token)
    // Có thể thêm logic để blacklist token nếu cần
  }

  return response.success(res, null, 'Đăng xuất thành công');
});

/**
 * Refresh token
 * POST /auth/refresh
 */
const refreshToken = catchAsync(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Refresh token là bắt buộc');
  }

  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token,
  });

  if (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, error.message || 'Refresh token không hợp lệ');
  }

  return response.success(res, {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  }, 'Refresh token thành công');
});

/**
 * Update user profile
 * PUT /auth/profile
 */
const updateProfile = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const { full_name, company_name } = req.body;

  // Update user_profiles table
  // Chỉ update các field có giá trị, không update updated_at vì có thể không có column này
  const updateData = {};
  if (full_name !== undefined) {
    updateData.full_name = full_name || null;
  }
  if (company_name !== undefined) {
    updateData.company_name = company_name || null;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No fields to update');
  }

  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update(updateData)
    .eq('user_id', req.user.id)
    .select('*')
    .single();

  if (updateError) {
    console.error('Supabase DB update error:', updateError);
    console.error('Update data:', updateData);
    console.error('User ID:', req.user.id);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to update profile: ${updateError.message}`);
  }

  return response.success(res, { profile: updatedProfile }, 'Profile updated successfully');
});

/**
 * Upload avatar
 * POST /auth/upload-avatar
 * Content-Type: multipart/form-data
 * Body: { avatar: File }
 */
const uploadAvatar = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  // Kiểm tra file có được gửi không
  if (!req.body || !req.body.avatar) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Avatar file is required');
  }

  // Lấy file từ body (dạng base64)
  let fileBuffer;
  let mimeType;

  // Parse base64
  const avatarData = req.body.avatar;
  if (typeof avatarData !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Avatar must be a base64 string');
  }

  const matches = avatarData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid base64 format. Expected: data:image/...;base64,...');
  }
  
  mimeType = matches[1];
  const base64Data = matches[2];
  fileBuffer = Buffer.from(base64Data, 'base64');

  // Validate file type
  if (!mimeType.startsWith('image/')) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File must be an image');
  }

  // Validate file size (max 5MB)
  if (fileBuffer.length > 5 * 1024 * 1024) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File size must be less than 5MB');
  }

  // Tạo tên file unique từ mime type
  const ext = mimeType.split('/')[1] || 'png';
  const uniqueFileName = `${req.user.id}-${Date.now()}.${ext}`;
  const filePath = `avatars/${uniqueFileName}`;

  // Upload lên Supabase Storage (dùng admin để bypass RLS)
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Supabase storage upload error:', uploadError);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to upload avatar: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Update avatar_url trong user_profiles
  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating profile:', updateError);
    // Nếu update fail, xóa file đã upload
    await supabaseAdmin.storage.from('avatars').remove([filePath]).catch(() => {});
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update profile');
  }

  return response.success(res, {
    avatar_url: publicUrl,
    profile: updatedProfile,
  }, 'Avatar uploaded successfully');
});

module.exports = {
  register,
  login,
  getMe,
  logout,
  refreshToken,
  updateProfile,
  uploadAvatar,
};

