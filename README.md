# MP Learning · MP Transformation

Nền tảng đào tạo nhân viên nội bộ, tùy biến từ ClassroomIO.

- Khóa học, bài học và bài tập.
- Chương trình đào tạo, theo dõi tiến độ và chứng chỉ.
- Quản lý nhân viên, giảng viên, phân quyền và báo cáo.
- Nhận diện MP Transformation, tiếng Việt mặc định, đăng ký có kiểm soát bằng lời mời/email được cấp phép.
- Không có website quảng bá hay landing page công khai trong luồng sử dụng.

## Chạy bằng Docker

```sh
node scripts/setup-mp.mjs --email admin@your-company.vn --origin http://localhost:3082
# Điền cấu hình SMTP trong .env trước khi mời nhân viên.
docker compose --profile storage up -d --build
```

Mở http://localhost:3082. Dùng email quản trị đã cấu hình để kích hoạt tài khoản tại `/signup` và tạo tổ chức MP Transformation.

Xem [hướng dẫn triển khai](docs/mp-deployment.md) cho HTTPS, lưu trữ, quyền truy cập, sao lưu và nghiệm thu production. Chỉ dùng compose build từ source; compose image upstream không chứa tùy biến MP.

## Phát triển

Node 24 theo `.nvmrc`, pnpm 10.19.0 theo `packageManager`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Cần PostgreSQL, Redis và cấu hình `apps/api/.env`, `apps/dashboard/.env`, `apps/jobs/.env` theo file example. Đặt cùng chế độ `PUBLIC_IS_SELFHOSTED=true`; cấu hình `LMS_ALLOWED_EMAILS` phía API cho tài khoản đầu tiên. Đặt cùng `DATABASE_URL`, `REDIS_URL` và API key của nhà cung cấp AI trong môi trường API và jobs.

`pnpm dev` (hoặc `pnpm mp:dev`) build các package cần thiết rồi tự chạy dashboard, API, worker tạo khóa học AI và các trình theo dõi code trong cùng một terminal. Khi một tiến trình dừng, các tiến trình còn lại cũng dừng để tránh giao diện vẫn chạy nhưng không có worker nhận việc. Sau khi khởi động lại máy, chạy lại `pnpm dev` để bật đầy đủ môi trường; không cần bật worker riêng.

Các lệnh `pnpm dashboard:dev`, `pnpm api:dev` và `pnpm jobs:dev` vẫn dùng được khi cần chạy từng phần riêng. Những worker khác như email, thông báo và xử lý media không được bật bởi `pnpm dev`; chạy `pnpm jobs:dev` khi cần thử các chức năng đó.

## Nguồn gốc

Dựa trên [ClassroomIO](https://github.com/classroomio/classroomio). Giữ nguyên [LICENSE](LICENSE) và các thông báo bản quyền upstream. Namespace `@cio/*`, tên bảng và cookie được giữ để tương thích; không phải mọi module dùng chung đã bị xóa khỏi monorepo.
