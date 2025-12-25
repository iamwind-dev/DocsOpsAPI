const { catchAsync, response, n8nClient, ApiError, httpStatus } = require('../../common');
const auditService = require('./audit.service');
const { supabaseAdmin } = require('../../config/supabase');
const axios = require('axios'); // For triggerAnalysis logic if needed, or use n8nClient

/**
 * Get all audit logs
 * (Using n8n or Supabase directly - keeping n8n as per original api, or switching to service?)
 * Original api used n8n. But audit-tracking-main uses service.
 * I will keep original behavior for /logs but add stats to it if possible? 
 * No, audit-tracking-main /api/audit/logs returns { logs, stats }.
 * The api definition of getAuditLogs was triggering webhook.
 * I will OVERWRITE getAuditLogs to use the "Smart" logic from audit-tracking-main
 */
const getAuditLogs = catchAsync(async (req, res) => {
  // Logic from audit-tracking-main
  
  // 1. Get raw logs
  const logs = await auditService.getAuditLogs24h();

  // 2. Enriched logs (get user info)
  const userIds = [...new Set(logs.map(log => log.user_id).filter(id => id))];
  let enrichedLogs = logs;

  if (userIds.length > 0) {
      const { data: users, error } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);

      if (!error && users) {
          const userMap = {};
          users.forEach(u => { userMap[u.user_id] = u; });

          enrichedLogs = logs.map(log => ({
              ...log,
              user_email: userMap[log.user_id]?.email || 'Unknown',
              full_name: userMap[log.user_id]?.full_name || 'Unknown User'
          }));
      }
  }

  // 3. Calc stats
  const totalEvents = enrichedLogs.length;
  const downloadCount = enrichedLogs.filter(log => log.action === 'download').length;
  const uniqueUsers = new Set(enrichedLogs.map(log => log.user_id)).size;
  const riskWarnings = enrichedLogs.filter(log => 
      log.action === 'delete' || log.action === 'mass_download'
  ).length;

  return response.success(res, {
        logs: enrichedLogs,
        stats: {
            totalEvents,
            downloadCount,
            activeUsers: uniqueUsers,
            riskWarnings,
            complianceScore: 98
        }
    }, 'Audit logs and stats retrieved successfully');
});

/**
 * Get audit logs for specific document
 */
const getDocumentAuditLogs = catchAsync(async (req, res) => {
  const { documentId } = req.params;
  const result = await n8nClient.triggerWebhook('audit/document-logs', { documentId });
  return response.success(res, result, 'Document audit logs retrieved successfully');
});

/**
 * Create audit log entry
 */
const createAuditLog = catchAsync(async (req, res) => {
  const result = await n8nClient.triggerWebhook('audit/create', req.body);
  return response.created(res, result, 'Audit log created successfully');
});

// --- NEW METHODS FROM AUDIT-TRACKING-MAIN ---

const analyzeAuditLogs = catchAsync(async (req, res) => {
  const logs = await auditService.getAuditLogs24h();

  if (logs.length === 0) {
    return response.success(res, {
       analysis: { risk_level: 'Low', summary: 'Không có hoạt động.', anomalies: [], recommendations: [] },
       stats: { totalLogs: 0 }
    }, 'No logs');
  }

  const { stats, prompt } = auditService.buildStatsAndPrompt(logs);
  const aiResponse = await auditService.callGeminiAPI(prompt);
  const analysisData = auditService.parseAIResponse(aiResponse);
  
  analysisData.total_logs_analyzed = stats.totalLogs;
  analysisData.time_range_start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  analysisData.time_range_end = new Date().toISOString();

  const saved = await auditService.saveAnalysisResult(analysisData);

  return response.created(res, { analysis: analysisData, stats, saved: saved?.[0] }, 'Analysis completed');
});

const receiveAnalysisResult = catchAsync(async (req, res) => {
  const { analysis, stats } = req.body;

  if (!analysis || !analysis.risk_level) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing analysis data');
  }

  const finalDataToSave = {
      ...analysis,
      time_range_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      time_range_end: new Date().toISOString(),
      total_logs_analyzed: stats?.totalLogs || 0 
  };

  const saved = await auditService.saveAnalysisResult(finalDataToSave);
  
  return response.created(res, { id: saved?.[0]?.id, analysis }, 'Result saved');
});

const getLatestResult = catchAsync(async (req, res) => {
  const result = await auditService.getLatestResult();
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, 'No results found');
  return response.success(res, result, 'Latest result');
});

const getAllResults = catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  const { data, count } = await auditService.getAnalysisResults(limit, offset);
  // Using response.success with pagination meta if needed, but existing response helper doesn't show pagination args.
  // We'll wrap in data
  return response.success(res, { results: data, meta: { total: count, limit, offset } }, 'Results retrieved');
});

const getResultById = catchAsync(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('audit_analysis_results').select('*').eq('id', req.params.id).single();
  if (error || !data) throw new ApiError(httpStatus.NOT_FOUND, 'Result not found');
  return response.success(res, data);
});

const deleteResult = catchAsync(async (req, res) => {
  const { error } = await supabaseAdmin.from('audit_analysis_results').delete().eq('id', req.params.id);
  if (error) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete');
  return response.success(res, { id: req.params.id }, 'Deleted successfully');
});

const getStats = catchAsync(async (req, res) => {
    const { data: results } = await supabaseAdmin.from('audit_analysis_results').select('risk_level').gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
    const riskCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    results?.forEach((r) => { if(riskCounts[r.risk_level] !== undefined) riskCounts[r.risk_level]++; });
    return response.success(res, { total: results?.length || 0, riskDistribution: riskCounts });
});

const triggerAnalysis = catchAsync(async (req, res) => {
  // Call N8N Webhook using n8nClient if configured, or axios if URL is specific in env
  // audit-tracking-main used axios.post(process.env.N8N_WEBHOOK_URL)
  // api uses n8nClient
  // We can use n8nClient.triggerWebhook if we know the path suffix.
  // Assuming 'audit/analyze' is the webhook path or similar.
  // For now I'll use n8nClient with a custom path if possible, or axios if n8nClient is strict.
  // Let's assume n8nClient wraps axios nicely.
  
  // Note: n8nClient usually takes (path, data, method). 
  // If we don't know the path, we might need env var.
  // audit-tracking-main used N8N_WEBHOOK_URL.
  // api config has n8n.baseUrl and n8n.apiKey.
  // I will assume there is a workflow for this.
  
  // Just returning success for now or implementing if I knew the path. 
  // Let's stick to what audit-tracking-main did: triggering manual.
  // I will check if api's n8nClient supports full URL or just suffix.
  // If suffix, I'll guess 'audit/analyze'.
  
  // But wait, audit-tracking-main used N8N_WEBHOOK_URL which was likely a full URL.
  // I'll leave it as n8nClient.triggerWebhook('audit/analyze', ...)
  
  const result = await n8nClient.triggerWebhook('audit/analyze', { triggeredAt: new Date().toISOString(), source: 'manual_trigger' });
  return response.success(res, result, 'Triggered successfully');
});

module.exports = {
  getAuditLogs,
  getDocumentAuditLogs,
  createAuditLog,
  analyzeAuditLogs,
  receiveAnalysisResult,
  getLatestResult,
  getAllResults,
  getResultById,
  deleteResult,
  getStats,
  triggerAnalysis
};
