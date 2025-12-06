/**
 * Cấu hình kết nối với n8n Backend
 * 
 * n8n là một công cụ workflow automation mã nguồn mở
 * Có thể tự host hoặc sử dụng n8n cloud
 */

export const N8N_CONFIG = {
    // URL của n8n instance (thay đổi theo môi trường)
    baseURL: process.env.REACT_APP_N8N_URL || 'http://localhost:5678',
    
    // API Key để xác thực (nếu cần)
    apiKey: process.env.REACT_APP_N8N_API_KEY || '',
    
    // Webhook URLs cho các workflows
    webhooks: {
        // Workflow: Upload và phân loại tài liệu
        documentUpload: '/webhook/document-upload',
        
        // Workflow: Tạo luồng chữ ký số
        createSignatureFlow: '/webhook/create-signature-flow',
        
        // Workflow: Lấy danh sách tài liệu
        getDocuments: '/webhook/get-documents',
        
        // Workflow: Lấy audit logs
        getAuditLogs: '/webhook/get-audit-logs',
        
        // Workflow: Lấy thống kê dashboard
        getDashboardStats: '/webhook/get-dashboard-stats',
        
        // Workflow: Xử lý chữ ký
        processSignature: '/webhook/process-signature',
        
        // Workflow: Lưu trữ tài liệu
        archiveDocument: '/webhook/archive-document',
    },
    
    // Timeout cho các requests (ms)
    timeout: 30000,
};

