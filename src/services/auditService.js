// src/services/auditService.js
const { supabaseAdmin } = require('../config/supabase');

/**
 * Ghi log hành động của người dùng vào bảng audit_logs
 */
const logAction = async (userId, action, resourceType, details, req) => {
  try {
    // Lấy IP của người dùng
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // Insert vào Supabase
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: action,              // VD: login, register, sign_document
        resource_type: resourceType, // VD: auth, signature
        details: details,            // Object JSON chứa thông tin thêm
        ip_address: ipAddress
      });

    if (error) {
      console.error('⚠️ Lỗi ghi Audit Log:', error.message);
    } else {
      console.log(`📝 Audit Log ghi thành công: ${action} bởi user ${userId}`);
    }
  } catch (err) {
    console.error('⚠️ Lỗi hệ thống Audit Service:', err);
  }
};

module.exports = { logAction };