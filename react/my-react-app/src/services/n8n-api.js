/**
 * N8N API Service
 * 
 * Service layer để giao tiếp với n8n workflows thông qua webhooks và REST API
 */

import { N8N_CONFIG } from './config';

class N8NApiService {
    constructor(config) {
        this.baseURL = config.baseURL || 'http://localhost:5678';
        this.apiKey = config.apiKey || '';
        this.timeout = config.timeout || 30000;
        this.webhooks = config.webhooks || {};
    }

    /**
     * Tạo headers cho requests
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.apiKey) {
            headers['X-N8N-API-KEY'] = this.apiKey;
        }
        
        return headers;
    }

    /**
     * Gọi webhook của n8n
     * @param {string} webhookPath - Đường dẫn webhook
     * @param {object} data - Dữ liệu gửi kèm
     * @returns {Promise}
     */
    async callWebhook(webhookPath, data = {}) {
        const url = `${this.baseURL}${webhookPath}`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('N8N Webhook Error:', error);
            throw error;
        }
    }

    /**
     * Upload tài liệu và trigger workflow phân loại tự động
     * @param {File} file - File tài liệu
     * @param {object} metadata - Metadata bổ sung
     */
    async uploadDocument(file, metadata = {}) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('metadata', JSON.stringify(metadata));
        formData.append('userId', metadata.userId || 'anonymous');
        formData.append('timestamp', new Date().toISOString());

        const url = `${this.baseURL}${this.webhooks.documentUpload}`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...(this.apiKey ? { 'X-N8N-API-KEY': this.apiKey } : {})
                },
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Document Upload Error:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách tài liệu
     * @param {object} filters - Bộ lọc (category, dateRange, etc.)
     */
    async getDocuments(filters = {}) {
        return await this.callWebhook(this.webhooks.getDocuments, {
            filters,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Tạo luồng chữ ký số
     * @param {object} signatureData - Thông tin chữ ký
     */
    async createSignatureFlow(signatureData) {
        return await this.callWebhook(this.webhooks.createSignatureFlow, {
            ...signatureData,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Xử lý chữ ký (ký tài liệu)
     * @param {string} documentId - ID tài liệu
     * @param {string} signatureId - ID chữ ký
     * @param {object} signatureData - Dữ liệu chữ ký (signature image, etc.)
     */
    async processSignature(documentId, signatureId, signatureData) {
        return await this.callWebhook(this.webhooks.processSignature, {
            documentId,
            signatureId,
            ...signatureData,
            signedAt: new Date().toISOString()
        });
    }

    /**
     * Lấy thống kê dashboard
     */
    async getDashboardStats() {
        return await this.callWebhook(this.webhooks.getDashboardStats, {
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Lấy audit logs
     * @param {object} filters - Bộ lọc (userId, dateRange, action, etc.)
     */
    async getAuditLogs(filters = {}) {
        return await this.callWebhook(this.webhooks.getAuditLogs, {
            filters,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Lưu trữ tài liệu (archive)
     * @param {string} documentId - ID tài liệu
     * @param {object} archiveOptions - Tùy chọn lưu trữ
     */
    async archiveDocument(documentId, archiveOptions = {}) {
        return await this.callWebhook(this.webhooks.archiveDocument, {
            documentId,
            ...archiveOptions,
            archivedAt: new Date().toISOString()
        });
    }

    /**
     * Tìm kiếm tài liệu
     * @param {string} query - Từ khóa tìm kiếm
     * @param {object} options - Tùy chọn tìm kiếm
     */
    async searchDocuments(query, options = {}) {
        return await this.callWebhook(this.webhooks.getDocuments, {
            search: query,
            ...options,
            timestamp: new Date().toISOString()
        });
    }
}

// Khởi tạo service instance
const n8nApi = new N8NApiService(N8N_CONFIG);

export default n8nApi;

