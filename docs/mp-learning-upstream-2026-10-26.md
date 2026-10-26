# MP Learning — cập nhật ClassroomIO ngày 26/10/2026

Nguồn: [Upload videos from our MCP, a reusable media library and richer webhooks](https://feedback.classroomio.com/updates/p/upload-videos-from-our-mcp-a-reusable-media-library-and).

## Phạm vi tích hợp

MP Learning đã có tải video qua MCP/API, tải video và tài liệu vào thư viện dùng lại, quản lý thumbnail, lời mời hàng loạt, các cải tiến chứng chỉ, điểm danh và sidebar được nhắc trong bản phát hành. Bản tích hợp này bổ sung các phần còn thiếu:

- Thay thumbnail từ hộp chỉnh sửa media, phân trang thư viện và lưu bộ lọc trong URL.
- Phát video đã mã hóa bằng danh sách HLS nhiều mức chất lượng; sửa việc lấy độ sáng khung hình từ FFmpeg.
- Ghi nhận đầy đủ video được gắn qua API/MCP trong thư viện. Lưu bài học và thay các liên kết sử dụng media trong cùng transaction.
- Theo dõi hoàn thành khóa học độc lập với cấp chứng chỉ; sự kiện hoàn thành khóa học tuân thủ được gửi theo chu kỳ.
- Mở rộng payload webhook với SSO external ID, phân loại khóa học, điểm, tiến độ, chứng chỉ, liên kết, người thực hiện và nguồn thay đổi.
- Thêm sự kiện thành viên tổ chức/nhóm học tập, trạng thái tuân thủ, xuất bản khóa học, lịch học trực tiếp và yêu cầu thanh toán.
- API/MCP cho mẫu khóa học, mẫu email học viên theo ngôn ngữ, sao chép khóa học và lựa chọn khóa học nổi bật.
- MCP nguồn phiên bản `0.3.0`, đóng gói các thư viện workspace cần thiết vào bundle.

Các commit chính từ ClassroomIO: `7251e85ea`, `6503f644d`, `0dc65b84e`, `68c908646`, `db39a631a`, `7bd0a10d6`, `2a718fafc`, `eb7b7a09d`. Các thay đổi phụ thuộc về nguồn sự kiện, tài liệu và đóng gói MCP cũng được tích hợp.

## Điều chỉnh cho MP Learning

- Giữ thương hiệu, cấu hình máy chủ API nội bộ, luồng đăng ký nội bộ, mô hình Gemini và các màn hình học tập hiện có.
- Chế độ self-hosted không gửi sự kiện PostHog mới. `CIO_TELEMETRY_DISABLED=true` cũng tắt chúng khi chạy production.
- Public API vẫn phục vụ tại `/public-api/v1`; được ghép dưới router `/public-api` và tách khỏi kiểu RPC của dashboard.
- Chỉ có một migration mới: `packages/db/src/migrations/0042_mp_learning_media_webhooks.sql`.
- Migration bổ sung `groupmember.completed_at`, `submission.graded_by`, chuyển thời điểm chứng chỉ đã cấp thành dữ liệu hoàn thành, và bổ sung quyền organization cho các khóa MCP có đầy đủ bộ quyền mặc định trước đây. Khóa có quyền tùy chỉnh hẹp hơn được giữ nguyên.
- Timestamp của migration mới lớn hơn timestamp lớn nhất trên `origin/main` tại thời điểm tích hợp.

## Triển khai

Dùng Node `v24.22.1` theo `.nvmrc`, cài dependency theo lockfile, rồi chạy:

```sh
pnpm install --frozen-lockfile
pnpm --filter @cio/api^... build
pnpm --filter @cio/api build
pnpm --filter @cio/dashboard^... build
pnpm --filter @cio/dashboard build
pnpm --filter @cio/jobs-worker build
pnpm mcp:build
```

Với dashboard lớn, có thể cần đặt `NODE_OPTIONS=--max-old-space-size=8192` riêng cho lệnh build.

Khi triển khai lên môi trường đích, chạy migration trước khi khởi động bản API/worker mới:

```sh
pnpm --filter @cio/db db:migrate
```

Không thay thế bước này bằng `db:push`: migration còn chuyển dữ liệu hoàn thành và quyền của các khóa MCP cũ.

Giữ nguyên cấu hình object storage, worker media/FFmpeg và địa chỉ phát video của hệ thống. Video HLS dùng cơ chế ký hiện có; cần cấu hình `HLS_SIGNING_SECRET` tương ứng với máy chủ phục vụ media.

Nếu dùng MCP từ mã MP Learning trên máy này, sau khi build, cấu hình client chạy `node` với đường dẫn tuyệt đối tới `packages/mcp/dist/index.js`. Truyền `CLASSROOMIO_API_URL` là địa chỉ API MP Learning và `CLASSROOMIO_API_KEY` là khóa MCP của tổ chức. Tên biến môi trường được giữ để tương thích giao thức hiện có.

## Kiểm tra sau triển khai

1. Tải video/tài liệu lên Media Manager, gắn cùng một media vào hai bài học và kiểm tra số nơi sử dụng.
2. Đổi thumbnail, lọc thư viện, tải thêm kết quả rồi tải lại trang để kiểm tra bộ lọc.
3. Dùng MCP tải video, gắn vào bài học và kiểm tra phát video HLS sau khi worker xử lý.
4. Bật webhook cho `course.completed`, hoàn thành khóa học tắt chứng chỉ và kiểm tra sự kiện được gửi đúng một lần.
5. Kiểm tra thêm một sự kiện thành viên, một sự kiện lịch học và payload có liên kết trỏ về MP Learning.
6. Dùng khóa MCP mới và một khóa mặc định được nâng cấp để kiểm tra mẫu khóa học, mẫu email, sao chép và khóa học nổi bật.

Migration được kiểm chứng trên cơ sở dữ liệu sao chép riêng; cơ sở dữ liệu gốc không được nâng cấp trong quá trình tích hợp mã.

## Kết quả xác minh

- Build phụ thuộc dashboard, dashboard, core, API và jobs worker thành công với Node `v24.22.1`. Dashboard cần giới hạn heap 8 GB; API/core được build sạch để loại bỏ declaration cũ từ các tiến trình watch đang chạy.
- Bộ kiểm thử API đã chạy 91 tệp với 1.286 ca trên DB sao chép sau migration. Các ca chứng chỉ phụ thuộc chế độ cloud đã được cố định cấu hình trong fixture và chạy lại thành công; các kiểm thử transaction của bài học cũng đã qua.
- 33 ca kiểm thử riêng của MP Learning về đăng ký nội bộ, quyền học tập, analytics và Gemini đều qua.
- 37 ca kiểm thử hợp đồng API mới và 7 ca kiểm thử FFmpeg đều qua.
- MCP typecheck/build thành công. Smoke test qua stdio đăng ký 128 công cụ và xác nhận 8 công cụ tiêu biểu, gồm upload video và các nhóm công cụ mới.
- Đã chạy `pnpm translate`; kiểm tra 187 bản dịch tương ứng với 17 khóa tiếng Anh thay đổi, không thiếu khóa hoặc sai placeholder `{...}`.
- Validator docs và Help Center trả về thành công, còn 27 và 12 cảnh báo về nội dung/asset trong bộ tài liệu hiện có.
- Chưa kiểm thử upload/phát video thực tế trên môi trường triển khai. Thực hiện checklist phía trên sau khi nâng cấp DB và khởi động dịch vụ.
