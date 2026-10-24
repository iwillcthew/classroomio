# Bảng thuật ngữ & quy tắc viết tiếng Việt — MP Learning (LMS nội bộ MP Transformation)

Sản phẩm: **MP Learning** — cổng học tập nội bộ của **MP Transformation**. Người dùng là nhân viên công ty
(quản trị viên, giảng viên/người phụ trách đào tạo, học viên). Không phải sản phẩm thương mại bán ra ngoài.

## Quy tắc bắt buộc

1. Giữ nguyên tuyệt đối mọi placeholder `{name}`, `{count}`… và cú pháp ICU
   (`{count, plural, one {...} other {...}}`, `{x, select, ...}`). Chỉ dịch phần chữ bên trong nhánh.
   Không dịch tên biến, từ khoá `plural`, `select`, `one`, `other`, `=0`, `=1`, `undefined`.
   Giữ nguyên thẻ HTML/markdown (`<b>`, `<a href=...>`, `**`, `\n`) và URL.
2. **Không bao giờ** nhắc tới "ClassroomIO", "Classroom IO", "Lớp họcIO", classroomio.com.
   Thay bằng "MP Learning" (tên nền tảng) hoặc "MP Transformation" (tên công ty), hoặc viết lại câu để bỏ hẳn.
   Các câu mời nâng cấp gói/tính giá/"đầu tư vào tương lai của chúng tôi" → viết trung tính, phù hợp hệ thống nội bộ
   (ví dụ "Tính năng này chưa được bật cho tổ chức. Liên hệ quản trị viên.").
3. Viết hoa kiểu câu: chỉ viết hoa chữ cái đầu (và tên riêng). "Tạo khóa học", không "Tạo Khóa Học".
   Mục điều hướng/menu cũng viết hoa chữ đầu ("Cộng đồng", không "cộng đồng").
4. Xưng hô: gọi người dùng là "bạn". Hệ thống tránh "chúng tôi" khi không cần. Giọng văn chuyên nghiệp, ngắn gọn,
   thân thiện, tự nhiên như người Việt viết — không dịch word-by-word, không văn máy.
5. Nút bấm/CTA: động từ + tân ngữ, ngắn (≤ 4 từ nếu được): "Lưu thay đổi", "Thêm học viên", "Xuất bản".
6. Thông báo lỗi: nói rõ chuyện gì xảy ra + cách xử lý. "Không lưu được bài học. Vui lòng thử lại."
   Thông báo thành công: "Đã lưu bài học", "Đã gửi lời mời".
7. Trạng thái rỗng: tiêu đề ngắn + 1 câu hướng dẫn hành động tiếp theo.
8. Độ dài: giữ độ dài tương đương bản tiếng Anh, tránh câu quá dài làm vỡ giao diện.
9. Dùng chính tả "khóa học", "hóa", "thủy" (dấu đặt kiểu mới: hóa, khóa, thúy…) thống nhất toàn bộ.
10. Dấu ba chấm dùng ký tự "…" nếu bản gốc dùng "…"; giữ nguyên dấu câu cuối như bản tiếng Anh.
11. Thuật ngữ kỹ thuật phổ biến giữ tiếng Anh khi người Việt dùng quen: Email, URL, API, webhook, widget, SSO,
    token, Zapier, MCP, HLS, CSV, PDF, slug, embed (có thể "nhúng"), AI.

## Thuật ngữ thống nhất

| English | Tiếng Việt |
|---|---|
| Organization / Org | Tổ chức |
| Academy / Site / Org site / School | Cổng học tập |
| Workspace | Không gian làm việc |
| Dashboard | Tổng quan (trang), Bảng điều khiển (khi nói về khu quản trị) |
| Home | Trang chủ |
| Course | Khóa học |
| Course content | Nội dung khóa học |
| Section (of course) | Chương |
| Module | Học phần |
| Lesson | Bài học |
| Exercise / Assignment | Bài tập |
| Question | Câu hỏi |
| Quiz (live game) | Trắc nghiệm |
| Submission | Bài nộp |
| Grade / Grading / Mark | Điểm / Chấm điểm |
| Attempt | Lượt làm bài |
| Due date / Deadline | Hạn nộp |
| Progress | Tiến độ |
| Completion | Hoàn thành |
| Certificate | Chứng chỉ |
| Cohort | Lớp đào tạo |
| Learning path | Lộ trình học tập |
| Track | Lộ trình |
| Student / Learner | Học viên |
| Audience | Học viên (danh sách học viên của tổ chức) |
| Tutor / Instructor / Teacher | Giảng viên |
| Admin / Administrator | Quản trị viên |
| Owner | Chủ sở hữu |
| Member | Thành viên |
| Team / Teammates | Nhóm quản trị / Thành viên nhóm |
| People | Thành viên |
| Invite / Invitation | Mời / Lời mời |
| Enroll / Enrollment | Ghi danh |
| Join | Tham gia |
| Attendance | Điểm danh |
| News feed / Feed | Bảng tin |
| Post | Bài đăng / Đăng |
| Comment | Bình luận |
| Community | Cộng đồng |
| Discussion | Thảo luận |
| Media / Media manager | Thư viện tệp |
| Asset | Tệp |
| Upload | Tải lên |
| Download | Tải xuống |
| Video / Document | Video / Tài liệu |
| Template | Mẫu |
| Draft / Published / Publish / Unpublish | Bản nháp / Đã xuất bản / Xuất bản / Hủy xuất bản |
| Archive / Archived | Lưu trữ / Đã lưu trữ |
| Settings | Cài đặt |
| Profile | Hồ sơ |
| Account | Tài khoản |
| Sign in / Log in | Đăng nhập |
| Sign up | Đăng ký |
| Log out | Đăng xuất |
| Password | Mật khẩu |
| Analytics / Reports | Phân tích / Báo cáo |
| Insights | Thống kê |
| Compliance | Tuân thủ |
| Automation | Tự động hóa |
| Tags | Thẻ |
| Landing page | Trang giới thiệu |
| Custom domain | Tên miền riêng |
| Branding / Customize | Thương hiệu / Tùy chỉnh |
| Theme | Giao diện |
| Notifications | Thông báo |
| Schedule / Calendar | Lịch học / Lịch |
| Live class / Session | Buổi học trực tuyến / Buổi học |
| AI tutor | Trợ giảng AI |
| AI assistant | Trợ lý AI |
| Credits (AI) | Lượt dùng AI |
| Plan / Billing / Upgrade | Gói / Thanh toán / Nâng cấp (tránh dùng; viết trung tính) |
| Search | Tìm kiếm |
| Filter / Sort | Lọc / Sắp xếp |
| Save / Cancel / Discard | Lưu / Hủy / Bỏ thay đổi |
| Delete / Remove | Xóa / Gỡ (gỡ khỏi danh sách) |
| Edit | Chỉnh sửa (nút: "Sửa") |
| Preview | Xem trước |
| Copy / Copied | Sao chép / Đã sao chép |
| Link | Liên kết |
| Explore | Khám phá |
| My learning | Khóa học của tôi |
| Continue learning | Học tiếp |
| Get started | Bắt đầu |
| Learn more | Tìm hiểu thêm |
| Help | Trợ giúp |
| Untitled | Chưa đặt tên |
