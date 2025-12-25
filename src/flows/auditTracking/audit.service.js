const { supabaseAdmin } = require('../../config/supabase');
const geminiClient = require('../../config/gemini');
const { constants } = require('../../common');
const { THRESHOLDS, ANOMALY_TYPES } = constants;

/**
 * Lấy dữ liệu audit logs từ Supabase (24h qua)
 */
const getAuditLogs24h = async () => {
  try {
    // Lấy log trong 24h qua, sắp xếp mới nhất lên đầu
    const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        // .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Bỏ comment nếu muốn lọc cứng 24h
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
      throw new Error(`Supabase Error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching audit logs', error);
    throw error;
  }
};

/**
 * Xây dựng stats và prompt từ audit logs (Dành cho AI Gemini)
 */
const buildStatsAndPrompt = (summaryRows = []) => {
  const stats = {
    totalLogs: 0,
    uniqueUsers: new Set(),
    suspiciousPatterns: [],
    riskIndicators: {},
  };

  const userActions = {};

  if (summaryRows.length > 0) {
    summaryRows.forEach((row) => {
      const count = 1; 
      stats.totalLogs += count;

      const userId = row.user_id || 'unknown_user';
      const email = row.user_email || 'unknown_email';
      stats.uniqueUsers.add(userId);

      if (!userActions[userId]) {
        userActions[userId] = {
          email,
          actions: [],
          ip_list: row.ip_address ? [row.ip_address] : [],
          riskScore: 0,
        };
      }

      userActions[userId].actions.push({
        action: row.action,
        count,
        last_time: row.created_at,
        resource: row.details?.filename || 'N/A',
      });

      // --- LOGIC PHÁT HIỆN RỦI RO CƠ BẢN CHO AI ---
      if (row.action === 'download') userActions[userId].riskScore += 1;
      if (row.action === 'delete') userActions[userId].riskScore += 5;
    });

    stats.uniqueUsers = stats.uniqueUsers.size;
  }

  // Prompt gửi cho Gemini
  const prompt = `
SYSTEM: Bạn là hệ thống cảnh báo bảo mật (Security AI).
TASK: Phân tích dữ liệu hành vi người dùng dưới đây.

QUY TẮC BẮT BUỘC:
1. Trả về JSON thuần (Valid JSON Only).
2. Risk level: Low, Medium, High, Critical
3. Ngôn ngữ: TIẾNG VIỆT.

OUTPUT JSON FORMAT:
{
  "risk_level": "High/Medium/Low/Critical",
  "summary": "Tóm tắt ngắn gọn",
  "anomalies": [ { "user": "email/id", "issue": "Mô tả" } ],
  "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
}

INPUT DATA:
- Tổng số log: ${stats.totalLogs}
- Số user: ${stats.uniqueUsers}
- Chi tiết hành vi: ${JSON.stringify(userActions)}
`;

  return { stats, prompt, userActions };
};

/**
 * Gửi prompt tới Gemini API
 */
const callGeminiAPI = async (prompt) => {
  try {
    const response = await geminiClient.post('', {
      contents: [{ parts: [{ text: prompt }] }],
    });

    if (response.data.candidates && response.data.candidates[0].content.parts[0]) {
      return response.data.candidates[0].content.parts[0].text;
    }
    throw new Error('Invalid Gemini API response');
  } catch (error) {
    console.error('Gemini API Error', error.message);
    throw error;
  }
};

/**
 * Parse JSON output từ AI
 */
const parseAIResponse = (aiResponse) => {
  try {
    if (!aiResponse) return null;
    const firstOpen = aiResponse.indexOf('{');
    const lastClose = aiResponse.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1) {
      const jsonStr = aiResponse.substring(firstOpen, lastClose + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(aiResponse);
  } catch (error) {
    return { error: 'JSON Parse Failed', raw: aiResponse };
  }
};

/**
 * Lưu kết quả analysis vào Supabase
 */
const saveAnalysisResult = async (analysisData) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_analysis_results')
      .insert([{
          risk_level: analysisData.risk_level,
          summary: analysisData.summary,
          anomalies: analysisData.anomalies,
          recommendations: analysisData.recommendations,
          total_logs_analyzed: analysisData.total_logs_analyzed || 0,
          time_range_start: analysisData.time_range_start,
          time_range_end: analysisData.time_range_end,
          created_at: new Date().toISOString(),
      }])
      .select();

    if (error) throw new Error(`Supabase Insert Error: ${error.message}`);
    return data;
  } catch (error) {
    console.error('Error saving analysis result', error);
    throw error;
  }
};

/**
 * Lấy tất cả results
 */
const getAnalysisResults = async (limit = 10, offset = 0) => {
  const { data, error, count } = await supabaseAdmin
      .from('audit_analysis_results')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
  if (error) throw error;
  return { data, count };
};

/**
 * Lấy result gần nhất
 */
const getLatestResult = async () => {
  const { data, error } = await supabaseAdmin
      .from('audit_analysis_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
  if (error && error.code !== 'PGRST116') throw error; 
  return data;
};

module.exports = {
  getAuditLogs24h,
  buildStatsAndPrompt,
  callGeminiAPI,
  parseAIResponse,
  saveAnalysisResult,
  getAnalysisResults,
  getLatestResult,
};
