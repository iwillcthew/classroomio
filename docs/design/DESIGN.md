# MP Learning — Hệ thống thiết kế

Cổng học tập nội bộ của MP Transformation. Thiết kế gốc được dựng trên Google Stitch (project
"MP Learning — LMS nội bộ MP Transformation"); ảnh tham chiếu nằm trong `docs/design/stitch/`.

## Tinh thần

Điềm tĩnh, đáng tin cậy, tập trung vào nội dung. Phong cách doanh nghiệp nhưng thân thiện. Không dùng
gradient trên bề mặt làm việc, không ảnh minh họa trang trí bên trong ứng dụng (trừ trang đăng nhập).

## Màu sắc

Token khai báo ở `packages/ui/src/index.css` (`:root` và `.dark`) và giao diện mặc định
`body[data-theme='blue']` ở `apps/dashboard/src/app.css`.

| Vai trò | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--primary` | `#1e4a9c` | `#4a7bdb` | Nút chính, mục đang chọn, liên kết, vòng focus |
| `--brand-sky` | `#1d9bd7` | `#38b6ef` | Điểm nhấn, biểu đồ, thông tin |
| `--success` | `#0f9d76` | `#34c79c` | Hoàn thành, chứng chỉ |
| `--warning` | `#d97706` | `#fbbf24` | Sắp hết hạn |
| `--destructive` | `#dc2626` | `#f87171` | Lỗi, xóa |
| `--background` | `#f6f8fb` | `#0b1220` | Nền ứng dụng |
| `--card` | `#ffffff` | `#111a2b` | Thẻ, sidebar, thanh trên cùng |
| `--border` | `#e3e8ef` | trắng 9% | Viền 1px |
| `--muted-foreground` | `#64748b` | `#94a3b8` | Chữ phụ |

## Chữ

Be Vietnam Pro (tự host trong `apps/dashboard/static/fonts/be-vietnam-pro`, giấy phép OFL), đủ toàn bộ
dấu tiếng Việt. Cỡ chữ: tiêu đề trang 24/32 semibold, tiêu đề mục 18/28 semibold, nội dung 14/22,
chú thích 12/16 medium. Số liệu dùng `tabular-nums`.

## Hình khối

- Bo góc: nút và ô nhập 8px (`rounded-lg`), thẻ 12px (`rounded-xl`), nhãn và avatar tròn hoàn toàn.
- Thẻ: nền trắng, viền 1px, không đổ bóng khi đứng yên; thẻ bấm được thêm `shadow-md` và viền
  `primary/40` khi hover.
- Khoảng cách theo thang 4/8/12/16/24/32/48.

## Bố cục

- Sidebar 256px nền trắng, viền phải. Nhãn nhóm viết hoa cỡ 11px. Mục đang chọn: nền `primary/10`, chữ
  `primary` đậm, vạch chỉ báo 3px bên trái. Số đếm hiển thị dạng viên thuốc.
- Thanh trên cùng cao 56px, nền trắng mờ, có breadcrumb, tìm kiếm, thông báo.
- Đầu trang: tiêu đề + một dòng mô tả bên trái, hành động chính bên phải.
- Thẻ số liệu: nhãn, số lớn, mô tả nhỏ; ô biểu tượng tô nhạt màu chính ở góc phải.
- Thẻ khóa học: ảnh bìa 16:9 tràn viền, nhãn loại khóa học nổi trên ảnh, tiêu đề tối đa 2 dòng.

## Văn phong

Xem bảng thuật ngữ trong `docs/design/thuat-ngu.md`. Viết hoa kiểu câu, gọi người dùng là "bạn", nút bấm
bắt đầu bằng động từ.
