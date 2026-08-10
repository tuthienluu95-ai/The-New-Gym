# The New Gym — Hệ thống chấm công GROUP-X

Ứng dụng Next.js chạy trên Vercel, kết nối Supabase.

## Biến môi trường cần đặt trên Vercel
- `SUPABASE_URL` — Project URL (Supabase → Project Settings → Data API / API)
- `SUPABASE_SERVICE_ROLE_KEY` — khoá `service_role` (Supabase → Project Settings → API Keys)
- `ADMIN_PASSWORD` — mật khẩu đăng nhập trang quản trị (tự đặt)
- `SESSION_SECRET` — một chuỗi ngẫu nhiên dài bất kỳ (dùng để ký phiên)

## Chạy thử tại máy (tuỳ chọn)
```
npm install
cp .env.example .env.local   # rồi điền giá trị
npm run dev
```

## Đường dẫn chính
- `/quet?c=<qr_token>` — màn hình chấm công (mở khi quét QR của club)
- `/admin` — trang quản trị (đăng nhập bằng ADMIN_PASSWORD)
