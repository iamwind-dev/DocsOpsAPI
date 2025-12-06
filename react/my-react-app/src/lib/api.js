/**
 * API Client for Backend Communication
 * 
 * Base URL: http://localhost:3000/api/v1
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Make API request với error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Nếu có access token, thêm vào header
  // QUAN TRỌNG: Refresh token trước khi dùng để đảm bảo token còn hợp lệ
  const { supabase } = await import('./supabase');
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // Nếu không có session hoặc có lỗi, thử refresh
  if (!session || sessionError) {
    console.log('⚠️ No session or session error, attempting to refresh...');
    const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
    if (refreshedSession) {
      session = refreshedSession;
      console.log('✅ Session refreshed successfully');
    }
  }
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
    console.log('✅ Access token added to request header');
  } else {
    console.warn('⚠️ No access token available for API request');
  }

  try {
    const response = await fetch(url, config);
    
    // Kiểm tra content-type trước khi parse JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('⚠️ Response không phải JSON:', text.substring(0, 200));
      throw new Error(`Server không trả về JSON. Status: ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
      throw new Error('Response rỗng');
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('⚠️ Lỗi parse JSON:', parseError);
      console.error('⚠️ Response text:', text.substring(0, 500));
      throw new Error('Lỗi parse JSON từ server');
    }

    if (!response.ok) {
      throw new Error(result.message || result.error || `Request failed: ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error('❌ API Request Error:', error);
    throw error;
  }
}

/**
 * Auth API
 */
export const authAPI = {
  /**
   * Đăng ký tài khoản mới
   */
  register: async (email, password, full_name, company_name) => {
    console.log('📡 Đang gọi API đăng ký:', `${API_BASE_URL}/auth/register`);
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, company_name }),
    });
    console.log('✅ Đăng ký thành công');
    return result;
  },

  /**
   * Đăng nhập
   */
  login: async (email, password) => {
    console.log('📡 Đang gọi API đăng nhập:', `${API_BASE_URL}/auth/login`);
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('📡 Response status:', response.status, response.statusText);

    // Kiểm tra content-type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('⚠️ Response không phải JSON:', text.substring(0, 200));
      throw new Error(`Server không trả về JSON. Status: ${response.status}`);
    }

    const text = await response.text();
    console.log('📡 Response text (first 500 chars):', text.substring(0, 500));

    if (!text) {
      throw new Error('Response rỗng');
    }

    let result;
    try {
      result = JSON.parse(text);
      console.log('✅ Parse JSON thành công');
    } catch (parseError) {
      console.error('⚠️ Lỗi parse JSON:', parseError);
      console.error('⚠️ Response text:', text.substring(0, 500));
      throw new Error('Lỗi parse JSON từ server');
    }

    if (!response.ok) {
      throw new Error(result.message || result.error || `Đăng nhập thất bại (${response.status})`);
    }

    return result;
  },

  /**
   * Đăng xuất
   */
  logout: async () => {
    return await apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * Lấy thông tin user hiện tại
   */
  getMe: async () => {
    return await apiRequest('/auth/me');
  },

  /**
   * Cập nhật thông tin profile
   * @param {Object} data - Dữ liệu cập nhật (full_name, company_name)
   */
  updateProfile: async (data) => {
    return await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Upload avatar
   * @param {File} file - File ảnh
   */
  uploadAvatar: async (file) => {
    // Convert file to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result;
          const result = await apiRequest('/auth/upload-avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ avatar: base64 }),
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};

export default apiRequest;

