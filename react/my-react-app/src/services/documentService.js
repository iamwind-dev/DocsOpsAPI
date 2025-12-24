/**
 * Document Service
 * Service layer để xử lý các thao tác với tài liệu
 * Sử dụng n8n API service bên dưới
 */

import n8nApi from './n8nApi';

class DocumentService {
    constructor(apiService) {
        this.api = apiService;
    }

    async uploadFile(file, userId = 'current-user') {
        try {
            const metadata = {
                userId,
                originalName: file.name,
                fileSize: file.size,
                fileType: file.type
            };

            const result = await this.api.uploadDocument(file, metadata);
            return result;
        } catch (error) {
            console.error('Lỗi khi upload tài liệu:', error);
            throw error;
        }
    }

    async getDocuments(filters = {}) {
        try {
            const result = await this.api.getDocuments(filters);
            return result.documents || [];
        } catch (error) {
            console.error('Lỗi khi lấy danh sách tài liệu:', error);
            throw error;
        }
    }

    async searchDocuments(query) {
        try {
            const result = await this.api.searchDocuments(query);
            return result.documents || [];
        } catch (error) {
            console.error('Lỗi khi tìm kiếm:', error);
            throw error;
        }
    }
}

export const documentService = new DocumentService(n8nApi);
export default documentService;



