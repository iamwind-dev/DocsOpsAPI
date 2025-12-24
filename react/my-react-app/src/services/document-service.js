/**
 * Document Service
 * 
 * Service layer để xử lý các thao tác với tài liệu
 * Sử dụng n8n API service bên dưới
 */

import n8nApi from './n8n-api';

class DocumentService {
    constructor(apiService) {
        this.api = apiService;
    }

    /**
     * Upload tài liệu với xử lý tự động
     */
    async uploadFile(file, userId = 'current-user') {
        try {
            const metadata = {
                userId,
                originalName: file.name,
                fileSize: file.size,
                fileType: file.type
            };

            const result = await this.api.uploadDocument(file, metadata);

            // n8n workflow sẽ xử lý:
            // 1. OCR để đọc nội dung
            // 2. AI Classification để phân loại
            // 3. Auto-rename file
            // 4. Lưu vào storage
            // 5. Tạo audit log

            return result;
        } catch (error) {
            throw new Error('Lỗi khi upload tài liệu: ' + error.message);
        }
    }

    /**
     * Lấy danh sách tài liệu với filter
     */
    async getDocuments(filters = {}) {
        try {
            const result = await this.api.getDocuments(filters);
            return result.documents || [];
        } catch (error) {
            throw new Error('Lỗi khi lấy danh sách tài liệu: ' + error.message);
        }
    }

    /**
     * Tìm kiếm tài liệu
     */
    async searchDocuments(query) {
        try {
            const result = await this.api.searchDocuments(query);
            return result.documents || [];
        } catch (error) {
            throw new Error('Lỗi khi tìm kiếm: ' + error.message);
        }
    }
}

// Khởi tạo service instance
const documentService = new DocumentService(n8nApi);

export default documentService;

