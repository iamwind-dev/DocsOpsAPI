/**
 * N8N API Service
 * Service layer để giao tiếp với n8n workflows thông qua webhooks và REST API
 */

const N8N_CONFIG = {
    baseURL: process.env.REACT_APP_N8N_URL || 'http://localhost:5678',
    apiKey: process.env.REACT_APP_N8N_API_KEY || '',
    timeout: 30000,
    webhooks: {
        documentUpload: '/webhook/document-upload',
        createSignatureFlow: '/webhook/create-signature-flow',
        getDocuments: '/webhook/get-documents',
        getAuditLogs: '/webhook/get-audit-logs',
        getDashboardStats: '/webhook/get-dashboard-stats',
        processSignature: '/webhook/process-signature',
        archiveDocument: '/webhook/archive-document',
    },
};

class N8NApiService {
    constructor(config) {
        this.baseURL = config.baseURL;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout;
        this.webhooks = config.webhooks;
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.apiKey) {
            headers['X-N8N-API-KEY'] = this.apiKey;
        }
        
        return headers;
    }

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

    async getDocuments(filters = {}) {
        return await this.callWebhook(this.webhooks.getDocuments, {
            filters,
            timestamp: new Date().toISOString()
        });
    }

    async createSignatureFlow(signatureData) {
        return await this.callWebhook(this.webhooks.createSignatureFlow, {
            ...signatureData,
            createdAt: new Date().toISOString()
        });
    }

    async processSignature(documentId, signatureId, signatureData) {
        return await this.callWebhook(this.webhooks.processSignature, {
            documentId,
            signatureId,
            ...signatureData,
            signedAt: new Date().toISOString()
        });
    }

    async getDashboardStats() {
        return await this.callWebhook(this.webhooks.getDashboardStats, {
            timestamp: new Date().toISOString()
        });
    }

    async getAuditLogs(filters = {}) {
        return await this.callWebhook(this.webhooks.getAuditLogs, {
            filters,
            timestamp: new Date().toISOString()
        });
    }

    async archiveDocument(documentId, archiveOptions = {}) {
        return await this.callWebhook(this.webhooks.archiveDocument, {
            documentId,
            ...archiveOptions,
            archivedAt: new Date().toISOString()
        });
    }

    async searchDocuments(query, options = {}) {
        return await this.callWebhook(this.webhooks.getDocuments, {
            search: query,
            ...options,
            timestamp: new Date().toISOString()
        });
    }
}

export const n8nApi = new N8NApiService(N8N_CONFIG);
export default n8nApi;



