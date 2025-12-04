/**
 * Supabase Client Configuration
 * 
 * Tạo 2 loại client:
 * 1. supabaseAdmin: Sử dụng SERVICE_ROLE_KEY - có full quyền, dùng cho backend queries
 * 2. supabaseAuth: Sử dụng ANON_KEY - dùng để verify access token từ client
 * 
 * LƯU Ý BẢO MẬT:
 * - KHÔNG BAO GIỜ expose SERVICE_ROLE_KEY ra frontend
 * - SERVICE_ROLE_KEY bypass tất cả RLS policies
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

// Validate required environment variables
if (!config.supabase.url) {
  throw new Error('SUPABASE_URL is required');
}
if (!config.supabase.serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}
if (!config.supabase.anonKey) {
  throw new Error('SUPABASE_ANON_KEY is required');
}

/**
 * Supabase Admin Client
 * Sử dụng Service Role Key - có full quyền truy cập database
 * Dùng cho các operations backend như insert, update, delete
 */
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Supabase Auth Client  
 * Sử dụng Anon Key - dùng để verify JWT access token từ frontend
 * Client này chỉ dùng cho authentication, không dùng cho DB queries
 */
const supabaseAuth = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = {
  supabaseAdmin,
  supabaseAuth,
};
