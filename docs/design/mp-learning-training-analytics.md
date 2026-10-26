# Phân tích đào tạo nội bộ MP Learning

Trang: `/org/[slug]/analytics`. Báo cáo dành cho quản trị viên và giảng viên của MP Transformation; API từ chối học viên và tổ chức không có quyền truy cập.

## Nội dung

- Hiện trạng: nhân viên được giao khóa, tỷ lệ hoàn thành lượt học, lượt học chưa bắt đầu, đào tạo bắt buộc quá hạn.
- Phân bổ hoàn thành / đang học / chưa bắt đầu. Một nhân viên trong một khóa được tính là một lượt học.
- Hoạt động 7/30/90 ngày: nhân viên có hành động học tập, bài học đánh dấu hoàn thành và lượt nộp bài. Biểu đồ và bảng ngày dùng giờ Việt Nam.
- Việc cần theo dõi và các liên kết đến giao khóa, nhân viên, đào tạo bắt buộc.
- Bảng khóa học có tìm kiếm không dấu, lọc đã giao/quá hạn, tiến độ nội dung và trạng thái bản nháp. Xuất báo cáo qua công cụ CSV/XLSX/PDF/HTML dùng chung.
- Tối đa 5 nhân viên cần hỗ trợ, ưu tiên quá hạn, chưa có khóa, rồi đến các khóa chưa bắt đầu.

## Nguồn và định nghĩa

`GET /dash/learning-analytics?days=7|30|90` dùng hai truy vấn database, không dùng tracker lượt xem, PostHog, phễu marketing hoặc vị trí truy cập. Header tổ chức và phiên đăng nhập được kiểm tra trước khi đọc dữ liệu. Response không được cache công khai.

Hiện trạng tính nhân viên có tài khoản với vai trò học viên và membership ACTIVE; không tính lời mời chưa kích hoạt, tài khoản ngừng hoạt động, khóa đã lưu trữ hoặc khóa mẫu. Nhân sự quản trị/giảng viên không thuộc mẫu số nhân viên học tập này. Bộ lọc thời gian chỉ áp dụng phần hoạt động; snapshot vẫn là toàn bộ hiện trạng.

Khóa thông thường hoàn thành khi có nội dung và mọi bài học/bài tập đều hoàn thành. Bài tập dùng cùng predicate `submissionMeetsCompletionPolicySql` với hệ thống học tập: nộp bài hoặc đạt ngưỡng điểm tùy cấu hình. Nhiều lần nộp không làm tăng tiến độ vượt số bài tập. Khóa rỗng không tự hoàn thành.

Đào tạo bắt buộc xét kỳ mới nhất của từng nhân viên/khóa, không cộng nhiều kỳ lịch sử. Trạng thái compliant/waived được tính hoàn thành. Một lượt chưa hoàn thành là quá hạn khi qua due date hoặc kỳ hiện tại có trạng thái non_compliant.

Tiến độ nội dung trung bình và tỷ lệ hoàn thành là hai chỉ số khác nhau. Khóa chưa có nhân viên có tiến độ `null`, hiển thị dấu khuyết thay vì 0%. Nếu không có lượt học, tỷ lệ hoàn thành cũng là `null`.

Hoạt động đọc trạng thái `lesson_completion` hiện còn hoàn thành và timestamp cập nhật (hoặc tạo nếu thiếu timestamp cập nhật), cùng mọi lần nộp bài của nhân viên đang thuộc phạm vi báo cáo. Đây không phải nhật ký bất biến cho mọi lần bật/tắt đánh dấu; không suy diễn lịch sử hoàn thành khóa thông thường khi chưa có ledger tương ứng. Nhân viên có hoạt động được đếm duy nhất trong kỳ từ các hành động này, không suy từ đăng nhập hoặc lượt xem.

Mốc ngày dùng `Asia/Ho_Chi_Minh`, theo [ngữ nghĩa AT TIME ZONE của PostgreSQL](https://www.postgresql.org/docs/17/functions-datetime.html). Không thêm migration hoặc thay đổi dữ liệu khóa học.

## Kiểm tra

- Unit test quyền truy cập: quản trị, giảng viên, học viên, thiếu phiên, tổ chức khác và kỳ không hợp lệ.
- Integration test database bật bằng `MP_ANALYTICS_DB_TESTS=true`: bài tập phải đạt điểm, nhiều lần nộp, khóa rỗng, khóa mẫu, kỳ bắt buộc mới nhất, miễn học, nhân viên ngừng hoạt động, mốc ngày giờ Việt Nam, sự kiện ngoài kỳ/tương lai. Fixture chạy trong transaction luôn rollback.
- Unit test giao diện: tìm kiếm tiếng Việt kết hợp bộ lọc và thang biểu đồ khi rỗng.
- Tiếng Việt và tiếng Anh được biên soạn trực tiếp. Lệnh `pnpm translate` đã chạy nhưng dịch vụ upstream từ chối 401/429; các locale khác có fallback tiếng Anh cho khóa mới và đã kiểm tra placeholder.


Kết quả xác minh trên production cục bộ:

- Build dependency, API và dashboard thành công (Node 24.14.0 hiện có, heap build 8 GB; còn cảnh báo engine 24.22.1 của repo).
- 14 kiểm thử mới đạt: 12 API/service/database và 2 utility giao diện.
- Playwright kiểm tra dữ liệu thật, không gọi API marketing, tìm kiếm tiếng Việt không dấu, xuất CSV, kỳ 7/90 ngày, bảng ngày, dark mode, mobile 390 px và trạng thái làm mới lỗi.
- Bảng dữ liệu vừa chiều rộng nội dung ở desktop 1440 px; biểu đồ 90 ngày không cắt mất cột dữ liệu trên mobile.
- Không có pageerror trong luồng kiểm tra; không có request landing-stats/country-breakdown/course-funnel/popular-types/top-courses.
- Đã kiểm tra formatter cho toàn bộ thay đổi, prefix UI và git diff --check.

Ảnh: `reports/mp-redesign/learning-analytics-desktop.png`, `learning-analytics-mobile.png`, `learning-analytics-dark.png`. Log và CSV xuất thử ở cùng thư mục (không đưa vào Git).
