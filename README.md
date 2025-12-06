# E-Signature Module - DocsOps API

## Tổng quan

Module E-Signature là một phần của hệ thống DocsOps, cung cấp khả năng ký điện tử nội bộ cho tài liệu. Module này được tích hợp với n8n để tự động hóa các quy trình như gửi email thông báo và nhắc nhở.

## Cấu trúc thư mục

```
src/
├── app.js                          # Entry point
├── config/
│   ├── index.js                    # Configuration từ env
│   └── supabase.js                 # Supabase client setup
├── middlewares/
│   ├── index.js
│   ├── apiKeyAuth.js               # API key authentication
│   ├── authSupabase.js             # Supabase JWT authentication
│   └── errorHandler.js             # Error handling
├── common/
│   ├── index.js
│   ├── ApiError.js                 # Custom error class
│   ├── catchAsync.js               # Async error wrapper
│   ├── httpStatus.js               # HTTP status codes
│   ├── response.js                 # Response helpers
│   └── n8nClient.js                # N8N webhook client
└── flows/
    └── eSignature/
        ├── index.js
        ├── eSignature.routes.js    # Route definitions
        └── eSignature.controller.js # Business logic

database/
└── schema.sql                      # Database schema cho Supabase

n8n-workflows/
├── workflow-1-send-request-emails.json
├── workflow-2-reminder-cron.json
└── workflow-3-provider-integration.json
```

## Cài đặt

### 1. Clone và cài dependencies

```bash
cd api
npm install
```

### 2. Cấu hình environment

```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin thực
```

### 3. Tạo database tables

Chạy file `database/schema.sql` trong Supabase SQL Editor.

### 4. Chạy server

```bash
npm run dev   # Development với nodemon
npm start     # Production
```

## API Endpoints

Base URL: `/api/v1/e-signature`

### A. User Signature Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signature/register` | Đăng ký chữ ký mới |
| GET | `/signature/me` | Lấy thông tin chữ ký hiện tại |

### B. Signature Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signature-requests` | Tạo yêu cầu ký mới |
| GET | `/signature-requests` | Lấy danh sách yêu cầu |
| GET | `/signature-requests/:id` | Lấy chi tiết yêu cầu |
| PUT | `/signature-requests/:id/status` | Cập nhật trạng thái |

### C. Signing Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/documents/:documentId/sign` | Ký tài liệu |
| GET | `/documents/:documentId/signatures` | Lấy danh sách chữ ký |

### D. Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents/:documentId/signatures/:signatureId/verify` | Xác minh chữ ký |

### E. Internal Endpoints (cho n8n)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/internal/pending-signers` | Lấy signers chưa ký |
| POST | `/signature-requests/:id/provider-info` | Lưu thông tin provider |
| POST | `/provider/signed-file` | Nhận file đã ký |

## Ví dụ sử dụng API

### 1. Đăng ký chữ ký

```bash
curl -X POST http://localhost:3000/api/v1/e-signature/signature/register \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "123456",
    "label": "My Signature"
  }'
```

### 2. Tạo yêu cầu ký

```bash
curl -X POST http://localhost:3000/api/v1/e-signature/signature-requests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "uuid-of-document",
    "signers": [
      {
        "signerEmail": "signer1@example.com",
        "signerName": "John Doe",
        "orderIndex": 1
      },
      {
        "signerEmail": "signer2@example.com",
        "signerName": "Jane Smith",
        "orderIndex": 2
      }
    ],
    "message": "Please sign this contract",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

### 3. Ký tài liệu

```bash
curl -X POST http://localhost:3000/api/v1/e-signature/documents/DOCUMENT_ID/sign \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "123456",
    "requestId": "uuid-of-request"
  }'
```

### 4. Xác minh chữ ký

```bash
curl -X GET http://localhost:3000/api/v1/e-signature/documents/DOCUMENT_ID/signatures/SIGNATURE_ID/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## n8n Workflows

### Workflow 1: Send Signature Request Emails

**Trigger:** POST `/webhook/e-signature/send-request`

**Flow:**
1. Nhận `requestId` từ webhook
2. Gọi API backend lấy thông tin request và signers
3. Loop qua từng signer có status = 'pending'
4. Gửi email với link ký tài liệu
5. Update status của request thành 'sent'

### Workflow 2: Daily Reminder Cron

**Trigger:** Cron - Chạy hàng ngày lúc 9:00 AM

**Flow:**
1. Gọi API `/internal/pending-signers?days=2`
2. Loop qua các signers chưa ký sau 2 ngày
3. Gửi email nhắc nhở
4. Log audit event

### Workflow 3: External Provider Integration

**Part 1 - Create Envelope:**
- Trigger: POST `/webhook/e-signature/provider-create`
- Download PDF từ storage
- Gọi API provider để tạo envelope
- Lưu provider info vào backend

**Part 2 - Provider Callback:**
- Trigger: POST `/webhook/e-signature/provider-callback`
- Parse callback data
- Nếu signed: Download file đã ký, upload lên backend
- Log audit event

## Import Workflows vào n8n

1. Mở n8n dashboard
2. Vào Settings → Import
3. Import từng file JSON trong thư mục `n8n-workflows/`
4. Cấu hình credentials (SMTP, API keys)
5. Cấu hình environment variables:
   - `BACKEND_URL`: URL của backend API
   - `API_KEY`: API key cho internal endpoints
   - `FRONTEND_URL`: URL frontend
   - `SMTP_FROM_EMAIL`: Email gửi
   - `SUPABASE_URL`: URL Supabase project
   - `ESIGN_PROVIDER_URL`: URL của external provider (nếu dùng)
   - `ESIGN_PROVIDER_API_KEY`: API key của provider

## Bảo mật

### Lưu ý quan trọng

1. **PIN hashing:** Hiện tại dùng SHA256 cho demo. Production nên dùng bcrypt/argon2.

2. **Secret key:** 
   - Không bao giờ expose ra ngoài
   - Dùng cho HMAC signing
   - Mỗi user chỉ có 1 active signature

3. **Document hash:**
   - Hiện tại hash `doc-{id}` cho demo
   - Production nên hash nội dung file thực

4. **API Key vs JWT:**
   - User endpoints: Dùng Supabase JWT
   - Internal/n8n endpoints: Dùng API key

## Database Schema

Xem file `database/schema.sql` để biết chi tiết các tables:

- `documents` - Tài liệu
- `user_signatures` - Chữ ký nội bộ của user
- `document_signatures` - Chữ ký trên tài liệu
- `signature_requests` - Yêu cầu ký
- `signature_request_signers` - Danh sách người ký
- `audit_events` - Logging

## Troubleshooting

### 1. "SUPABASE_URL is required"
→ Kiểm tra file `.env` đã có đủ các biến Supabase

### 2. "Invalid or expired access token"
→ Token JWT đã hết hạn, cần refresh token

### 3. "No active signature found"
→ User chưa đăng ký chữ ký, gọi `/signature/register` trước

### 4. n8n workflow không chạy
→ Kiểm tra:
- Webhook URL đúng
- API key đúng
- Backend đang chạy
