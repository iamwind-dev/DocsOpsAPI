# AI DocOps - React App với Vite

Nền tảng Quản trị Tài liệu Thông minh với 5 AI Agents.

## Công nghệ

- **React 18** - UI Framework
- **Vite** - Build tool (nhanh hơn Create React App)
- **React Router v6** - Routing
- **n8n** - Backend workflow automation

## Cài đặt

```bash
npm install
```

## Chạy dự án

```bash
# Development mode
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

## Cấu trúc dự án

```
src/
  components/     # Components dùng chung (Header, Footer, Sidebar, Layout)
  pages/          # Các trang (Home, Login, Dashboard, etc.)
  services/       # API services (n8n-api, document-service)
  styles/         # CSS files (style.css, auth.css, dashboard.css)
```

## Routes

### Public Routes
- `/` - Trang chủ
- `/login` - Đăng nhập
- `/register` - Đăng ký
- `/pricing` - Bảng giá
- `/contact` - Liên hệ
- `/features` - Tính năng

### Dashboard Routes (Yêu cầu đăng nhập)
- `/dashboard` - Dashboard chính
- `/documents` - Kho tài liệu
- `/esignature` - Chữ ký số
- `/audit` - Audit Logs
- `/storage` - Lưu trữ
- `/settings` - Cài đặt
