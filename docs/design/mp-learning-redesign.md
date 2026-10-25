# MP Learning: UX/UI audit và định hướng thiết kế lại

Phạm vi: `apps/dashboard` (ứng dụng chính) và `packages/ui` (design system dùng chung).
Tài liệu này dựa trên code thật ở commit `bf77f0d6` và giao diện chạy cục bộ với dữ liệu seed (1 tổ chức, 12 khóa học, tài khoản quản trị và học viên).

---

## 1. Bối cảnh sản phẩm

MP Learning là nền tảng đào tạo nội bộ cho nhân viên MP Transformation:

- Một tổ chức duy nhất, self-hosted, tiếng Việt là ngôn ngữ chính.
- Người dùng được cấp quyền (danh sách email cho phép), không có đăng ký công khai.
- Hai nhóm người dùng chính:
  - **Nhân viên học tập**: cần biết hôm nay phải học gì, khóa nào bắt buộc, hạn chót khi nào, đã đạt chứng chỉ gì.
  - **Bộ phận đào tạo (quản trị viên, giảng viên)**: soạn nội dung, giao khóa học, theo dõi ai chưa hoàn thành đào tạo bắt buộc, chấm bài, xuất báo cáo.

ClassroomIO được thiết kế cho mô hình ngược lại: nhiều "trường học" thuê bao, bán khóa học công khai, có trang landing, gói cước, tên miền riêng. Phần lớn vấn đề UX bên dưới bắt nguồn từ độ lệch đó.

---

## 2. Audit

### 2.1 Kiến trúc thông tin (IA)

| Vấn đề | Bằng chứng trong code |
|---|---|
| Quản trị viên đăng nhập vào trang "Trang chủ" là công cụ tạo khóa học bằng AI, không phải tổng quan đào tạo | `features/app/init.svelte.ts` `goToOrg()` → `/org/{slug}`; `routes/(app)/org/[slug]/+page.svelte` |
| "Trang chủ" và "Tổng quan" cùng tồn tại, cùng mang nghĩa "trang đầu" | `features/ui/navigation/org-navigation.ts` |
| "Thống kê" là mục cha có URL `#`, không bấm vào được | `org-navigation.ts` (`useHashUrl`) |
| Nhóm điều hướng đặt tên theo mô hình creator ("Tạo", "Phân phối" rỗng), Thẻ và Thư viện tệp nằm trong nhóm "Đào tạo" | `GROUP_ORDER` trong `org-navigation.ts` |
| Cài đặt bị ẩn khỏi sidebar, chỉ vào được qua menu avatar | `hideFromSidebar` trong `org-navigation.ts` |
| Cài đặt có hai hệ điều hướng chồng nhau (sidebar + tab nội tuyến) | `settings-sidebar.svelte`, `org-settings-inline-tabs.svelte` |
| Breadcrumb mở đầu bằng bộ chuyển tổ chức (vô nghĩa với 1 tổ chức) | `app-breadcrumbs.svelte` |
| Sidebar khóa học là danh sách phẳng tới 12 mục, cây nội dung mở rộng đẩy các mục khác ra khỏi màn hình | `course-sidebar-navigation.svelte` |
| Học viên: "Cài đặt" là mục cha `#`, nhãn nhóm dùng chuỗi của quản trị ("Nền tảng") | `lms-navigation.ts`, `lms-sidebar/nav-main.svelte` |
| Các route mồ côi không được liên kết: quiz, teams-overview, widgets, setup, billing, workspaces; route trùng `/org/[slug]/{api,mcp,zapier}` | `routes/(app)/org/[slug]/**` |

### 2.2 Dấu vết ClassroomIO và mô hình SaaS trong trải nghiệm

- **Icon động "moving-icons"** ở mọi mục điều hướng (30 file): đây là đặc trưng nhận diện tương tác của ClassroomIO.
- Nút **"Cổng học tập" / "Xem trang landing"** trên header mở site công khai của tổ chức (mô hình academy bán khóa học).
- Vòng **tiến độ thiết lập** ("set up your school") trên header quản trị.
- **Gói cước, nâng cấp, giới hạn học viên, PremiumIcon** trong sidebar, nút "Mua/giá" trong modal xem trước khóa học, chứng chỉ bị ẩn khi ở gói miễn phí.
- **Trình dựng landing page khóa học**, widget nhúng, Zapier/MCP/API/webhook, tên miền tùy chỉnh, tín dụng AI.
- Ảnh bìa khóa học mặc định, khối "card" và bố cục trang lấy nguyên từ ClassroomIO.

### 2.3 Hệ thống thị giác

| Vấn đề | Quy mô |
|---|---|
| Màu cứng (`text-gray-500`, `bg-emerald-50`, `#E35353`...) bỏ qua token và dark mode | ~609 lần trong khu quản trị, thêm nhiều ở bài tập, hỏi đáp, nội dung khóa học |
| Vá dark mode bằng `dark:text-white` | 102 lần |
| Không có token trạng thái (thành công, cảnh báo, nguy hiểm, thông tin); mỗi màn tự định nghĩa bảng xanh/vàng/đỏ | compliance, goals, domains, marks, people |
| ~15 công thức độ rộng trang (`w-[90%]`, `max-w-3xl`...`6xl`, `calc(95vw-...)`, lỗi `max-auto`) | course/cohort/org pages |
| 3 header khác nhau (h-14 `bg-card/90`, h-12 `bg-background`, h-12 chỉ tên lớp) | `app-header`, `course-header`, `cohort-header` |
| `Page.Root` giả định header 48px trong khi header thật 56px | `packages/ui/src/base/page/page.svelte` |
| 4 thang tiêu đề section khác nhau, 15 thẻ `<h1>` thô | xem báo cáo trong mục 2.5 |

### 2.4 Trải nghiệm học viên

- Trang chủ hiển thị **cùng một khóa học 2 lần** (hero và "Đang học"), chỉ số tuân thủ 2 lần, loading bằng spinner, thẻ thống kê hiện 0% khi đang tải.
- **5 cách trình bày khóa học khác nhau** trên các trang học viên (hero, article card, `CourseListRow`, `CourseCard`, component chết `learning.svelte`).
- Tìm kiếm/sắp xếp ở "Khóa học của tôi" không hoạt động; ở "Khám phá" chỉ lọc trên trang hiện tại.
- Chuông thông báo của học viên là giao diện giả (luôn trống, nút làm mới không có handler).
- Trong khóa học, header chỉ hiện nhãn mục ("Nội dung"), không hiện tên khóa học/bài học. "Tiếp theo" có 3 hành vi khác nhau (header, footer sidebar, thanh dưới mobile).
- Trang Bài tập dùng kanban cố định `min-w-[355px] h-[70vh]` gây cuộn ngang trên mobile, màu cứng.

### 2.5 Trải nghiệm quản trị

- Danh sách khóa học **không có tiêu đề trang và không có nút "Tạo khóa học"** trên header.
- Tổng quan quản trị dùng thẻ tự dựng, KPI truyền qua prop `percentage` với `hidePercentage`.
- Trang Tuân thủ có 9 nút lọc trạng thái xếp hàng ngang.
- Trang khóa học: gần như mọi trang chỉ có tiêu đề, nút "Làm mới" thủ công đóng vai hành động chính (24 lần), nút Trợ lý AI có nền sóng động lấn át mọi thứ.
- Bảng điểm (gradebook) rộng nằm trong container hẹp nhất (`max-w-3xl`).

---

## 3. Định hướng thiết kế: "MP Ribbon"

Ngôn ngữ thiết kế lấy cảm hứng từ dải ruy băng gấp nếp trong logo MP: các mặt phẳng xanh navy, xanh dương, xanh cyan đan chéo nhau. Mục tiêu là một công cụ làm việc điềm tĩnh, đáng tin cậy, đọc tốt tiếng Việt, với một vài điểm nhấn thương hiệu rõ ràng thay vì trang trí dàn trải.

### 3.1 Nguyên tắc

1. **Việc cần làm trước, khám phá sau.** Trang đầu của nhân viên trả lời "hôm nay tôi cần học gì và hạn khi nào". Đào tạo bắt buộc có hạn chót là công dân hạng nhất.
2. **Vận hành đào tạo, không phải bán khóa học.** Quản trị viên thấy ai chưa hoàn thành, khóa nào quá hạn, bài nào chờ chấm. Không có giá, landing, gói cước.
3. **Một tổ chức, một thương hiệu.** Không chuyển tổ chức, không "academy site", không thông điệp nâng cấp.
4. **Một hệ thống, nhiều màn hình.** Mọi trang dùng chung khung: header, tiêu đề trang, độ rộng, thẻ, trạng thái rỗng, trạng thái tải.
5. **Thuật ngữ doanh nghiệp.** Nhân viên/học viên thay vì "khách hàng", "đối tượng"; chương trình/lớp đào tạo; đào tạo bắt buộc.

### 3.2 Màu sắc

| Token | Sáng | Tối | Vai trò |
|---|---|---|---|
| `--brand-navy` | `#0E2259` | `#0B1430` | Nền sidebar, tiêu đề hero |
| `--primary` | `#1559C6` | `#4C8DF6` | Hành động chính, trạng thái chọn |
| `--brand-cyan` | `#0EA5E0` | `#38BDF8` | Tiến độ, điểm nhấn "facet" |
| `--background` | `#F3F5F9` | `#0A0F1E` | Nền canvas |
| `--card` | `#FFFFFF` | `#111830` | Bề mặt nội dung |
| `--foreground` | `#0D1830` | `#E7ECF5` | Chữ chính |
| `--success` / `--warning` / `--danger` / `--info` (+ `-soft`) | | | Trạng thái học tập, tuân thủ, chấm điểm |

Sidebar dùng nền navy đậm ở cả hai chế độ. Đây là thay đổi nhận diện lớn nhất so với sidebar trắng của ClassroomIO.

### 3.3 Hình khối và chữ

- Font: Be Vietnam Pro (đã tự host, hỗ trợ đầy đủ dấu tiếng Việt). Số liệu dùng `tabular-nums`.
- Thang chữ: tiêu đề trang 24/600, tiêu đề section 16/600, nhãn eyebrow 11/600 in hoa giãn chữ.
- Bo góc: thẻ 12px, control 8px, chip 6px.
- Đổ bóng rất nhẹ (1 lớp hairline + 1 bóng mờ) cho thẻ, không dùng bóng lớn.
- **Facet**: hình bình hành nghiêng dùng làm chỉ báo mục đang chọn trong sidebar, đầu thanh tiến độ, nền hero và ảnh bìa khóa học mặc định (các dải chéo navy/blue/cyan kèm chữ viết tắt của khóa học).
- Icon: lucide tĩnh, nét 1.75. Bỏ icon động.

### 3.4 Kiến trúc thông tin mới

**Không gian học tập (nhân viên)**

| Mục | Route | Ghi chú |
|---|---|---|
| Tổng quan | `/lms` | Việc cần làm, tiếp tục học, buổi học sắp tới, đào tạo bắt buộc |
| Khóa học của tôi | `/lms/mylearning` | |
| Thư viện đào tạo | `/lms/explore` | Danh mục nội bộ, không có giá |
| Lớp đào tạo | `/lms/cohorts` | |
| Bài tập | `/lms/exercises` | Khi được bật |
| Chứng chỉ | `/lms/certificates` | Luôn hiện (không còn gắn với gói cước) |
| Hỏi đáp | `/lms/community` | Khi được bật |

Hồ sơ cá nhân và thông báo chuyển vào menu tài khoản ở chân sidebar.

**Quản trị đào tạo**

| Nhóm | Mục |
|---|---|
| (đầu) | Tổng quan (trang đích sau đăng nhập) |
| Nội dung | Khóa học, Soạn bằng AI, Lớp đào tạo, Thư viện tài liệu, Thẻ phân loại |
| Nhân sự | Học viên, Hỏi đáp |
| Báo cáo | Phân tích, Tuân thủ |
| Hệ thống | Tích hợp (quản trị viên), Cài đặt |

Header quản trị có nút "Không gian học tập" (sang `/lms`) thay cho "Cổng học tập" (site công khai).

### 3.5 Khung trang thống nhất

- Header 56px dùng chung: nút thu gọn sidebar, breadcrumb, tìm kiếm, thông báo.
- `Page.Header` có eyebrow, tiêu đề, mô tả, cụm hành động bên phải; khoảng cách cố định.
- Độ rộng chuẩn: `narrow` (cài đặt, biểu mẫu), `default` (trang danh sách), `wide` (bảng, bảng điểm).
- Trạng thái tải dùng skeleton đúng hình khối; trạng thái rỗng luôn có lời giải thích và hành động.

---

## 4. Trạng thái triển khai (đợt 1)

**Đã làm**

- **Token & primitive** (`packages/ui/src/index.css`, `packages/ui/src/base/*`): bảng màu MP, token trạng thái `success/warning/danger/info` (+ `-soft`, `-foreground`), `shadow-card`/`shadow-raised`, `bg-facet`, `facet-clip`, bo góc 8/12px; Badge dùng token trạng thái và có biến thể `info`; Card, Input, Select, Textarea, Tabs, Table head, Empty, Page (`Page.Eyebrow` mới, nhịp dọc mới) được tinh chỉnh.
- **Sửa lỗi hệ thống**: Tailwind của `packages/ui` giờ quét cả `apps/dashboard/src`, nên các lớp `ui:*` viết trong dashboard (trước đây nhiều lớp không sinh CSS, ví dụ `ui:bg-card/90`) đều có hiệu lực. Quy tắc ép màu xám cho icon được hạ độ ưu tiên bằng `:where()`.
- **Hài hòa toàn cục**: bảng `gray/slate/neutral/zinc/blue` của Tailwind được ánh xạ về thang màu thương hiệu ở cả dashboard và `packages/ui`.
- **Khung ứng dụng**: sidebar tông `ink` (navy) cho Quản trị, Học tập, Cài đặt; sidebar khóa học/lớp giữ tông sáng. Khối thương hiệu mới, icon lucide tĩnh thay icon động, IA mới (mục 3.4), topbar dùng chung, breadcrumb mở đầu bằng "Quản trị đào tạo"/"Không gian học tập", menu tài khoản có chuyển đổi không gian. Quản trị viên đăng nhập vào **Tổng quan**.
- **Màn hình**: Tổng quan quản trị (chỉ số, lối tắt quản trị, khóa học nổi bật, chứng chỉ mới cấp), Tổng quan học viên (hero "Tiếp tục học", đào tạo bắt buộc theo hạn chót, gợi ý từ thư viện), thẻ khóa học + ảnh bìa facet sinh theo tên, danh sách khóa học quản trị (header + hành động), header khóa học/lớp, mặt giấy đọc bài học, modal xem trước khóa học (bỏ giá/mua), Bài tập (lưới co giãn, màu theo token), màn đăng nhập.
- **Gỡ dấu vết**: ảnh bìa mặc định stock, link tài liệu classroomio.com, ảnh CDN ClassroomIO, Twitter `@classroomio`, `api.classroomio.dev`, UID lịch `@classroomio`, tệp xác minh Zoho; ẩn UpgradeModal/early-adopter khi self-hosted; chặn route thanh toán, workspace, tên miền, tín dụng AI, widget, Zapier, landing page tổ chức, checklist thiết lập; Cài đặt bỏ tab nội tuyến trùng lặp; cập nhật thuật ngữ `vi.json`.

**Còn lại (đợt sau)**

- Thay ~600 lớp màu cứng còn lại theo token trạng thái (ưu tiên: domains, marks, people, compliance, goals, exercise editor).
- Thống nhất độ rộng trang trong khóa học/lớp theo 3 preset; gom nhóm sidebar khóa học (Nội dung / Học viên & chấm điểm / Thiết lập).
- Gộp ba kiểu "Tiếp theo" trong trình học về một hành vi.
- Các bản dịch mới cho locale ngoài `vi`/`en` hiện dùng tạm tiếng Anh; chạy `pnpm translate` khi có khóa API.

---

## 5. Kế hoạch triển khai

| Giai đoạn | Nội dung | Phạm vi |
|---|---|---|
| 1. Nền tảng | Token màu/trạng thái/bóng/bo góc, sáng và tối; tinh chỉnh primitive (button, card, badge, input, tabs, table, page) | `packages/ui/src/index.css`, `packages/ui/src/base/*` |
| 2. Hài hòa toàn cục | Ánh xạ lại bảng màu Tailwind `gray/slate/blue/emerald/...` của dashboard về thang màu thương hiệu, để ~600 lớp màu cứng tự đồng bộ trong lúc dọn dần | `apps/dashboard/src/app.css` |
| 3. Khung ứng dụng | Sidebar navy mới, khối thương hiệu, icon tĩnh, IA mới, header thống nhất, menu tài khoản | `features/ui/sidebar/**`, `features/ui/navigation/**` |
| 4. Màn hình chính | Tổng quan học viên, thẻ khóa học + ảnh bìa facet, Khóa học của tôi, Thư viện, Tổng quan quản trị, danh sách khóa học, header khóa học | `features/lms/**`, `features/course/**`, `routes/(app)/**` |
| 5. Gỡ dấu vết SaaS | Ẩn gói cước/nâng cấp/landing/tên miền/tín dụng AI khỏi điều hướng và màn hình; sửa thuật ngữ trong `vi.json` | nhiều file |
| 6. Dọn tiếp | Thay màu cứng còn lại theo token trạng thái, thống nhất độ rộng trang khóa học/lớp | theo từng feature |
