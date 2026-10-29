# Quản lý tài khoản nhân viên MP Learning

## Cấp tài khoản

Quản trị mở **Nhân viên** trong khu vực quản trị. HR/L&D và quản lý bộ phận mở **Nhân viên** trong khu vực học tập. HR/L&D quản lý nhân viên thông thường và quản lý bộ phận; chỉ quản trị hệ thống được cấp hoặc thay đổi quyền HR/L&D, giảng viên và quản trị.

Chọn **Thêm nhân viên**, nhập mã nhân viên, họ tên, email, phòng ban, chức danh, ngày vào làm và quản lý trực tiếp. Chọn khóa học/chương trình nếu cần. **Lưu nháp** không gửi email. **Tạo và gửi kích hoạt** cấp hồ sơ và gửi liên kết để nhân viên tự đặt mật khẩu.

Mã nhân viên được chuẩn hóa thành chữ hoa, có tối đa 50 ký tự: chữ Latin, số, dấu chấm, gạch ngang hoặc gạch dưới. Mã nhân viên và email không thay đổi qua biểu mẫu sửa hồ sơ. Tài khoản cũ tiếp tục đăng nhập bằng email. Có thể thêm hồ sơ nhân viên cho thành viên cũ với cùng email và vai trò; việc này không thay mật khẩu hiện có.

Email vẫn bắt buộc để xác nhận chủ tài khoản, kích hoạt và khôi phục mật khẩu. Không tạo email giả cho nhân viên chưa có hộp thư.

## Kích hoạt và đăng nhập

Nhân viên mở thư kích hoạt, kiểm tra tên/mã được hiển thị, đặt mật khẩu và đăng nhập bằng **mã nhân viên hoặc email**. Nếu email đã có tài khoản, bước kích hoạt giữ mật khẩu cũ. Quên mật khẩu vẫn dùng địa chỉ email đã đăng ký.

Liên kết kích hoạt có hiệu lực 48 giờ, dùng một lần và chỉ lưu bản băm SHA-256 trong cơ sở dữ liệu. Gửi lại sẽ vô hiệu hóa liên kết trước. Tạm khóa/nghỉ việc cũng vô hiệu hóa các liên kết đang chờ. Tài khoản do HR quản lý phải dùng luồng kích hoạt, không đăng ký lại qua `/signup`.

Cấu hình SMTP theo [hướng dẫn triển khai](./mp-deployment.md). Khi gửi email lỗi, hồ sơ vẫn được lưu; giao diện thông báo riêng kết quả gửi để HR kiểm tra cấu hình và gửi lại. Không coi tài khoản đã tạo là email đã được gửi.

## Nhập danh sách

Nhập `.csv` hoặc `.xlsx`, tối đa 1.000 dòng và 5 MB. Các cột bắt buộc: `employeeCode`, `fullname`, `email`. Cột tùy chọn: `department`, `jobTitle`, `startDate` theo `YYYY-MM-DD`, `managerCode` là mã của quản lý đã hoạt động. Mã có số 0 ở đầu cần được lưu dưới dạng văn bản trong Excel.

Tài khoản nhập nhận vai trò Nhân viên. Các quyền cao hơn được cấp riêng bởi người đủ thẩm quyền. Có thể chọn khóa học/chương trình chung và gửi kích hoạt hoặc lưu nháp cho cả đợt.

Chạy **Kiểm tra danh sách** trước khi xác nhận. Dòng sai định dạng, trùng mã/email, quản lý không hợp lệ hoặc không có quyền sẽ có kết quả riêng. Khi xác nhận, trình duyệt xử lý từng nhóm nhỏ và hiển thị kết quả từng dòng; giữ trang mở đến khi hoàn tất. Nếu kết nối bị ngắt, kiểm tra danh sách và kết quả đã nhận trước khi thử lại. Nhập lại không ghi đè hay tạo trùng người đã có. Có thể tải các dòng lỗi để sửa.

## Phân quyền và vòng đời

| Vai trò | Phạm vi |
| --- | --- |
| Quản trị hệ thống | Quản lý toàn tổ chức, cấu hình và cấp quyền cao |
| HR/L&D | Tạo/sửa, giao đào tạo và quản lý vòng đời nhân viên thông thường/quản lý bộ phận |
| Quản lý bộ phận | Chỉ xem danh sách và kết quả của nhân viên có quan hệ quản lý trực tiếp |
| Giảng viên | Giữ quyền quản lý khóa học được phân công; không có quyền quản trị nhân viên |
| Nhân viên | Học tập trong phạm vi được giao |

Trạng thái tài khoản gồm **Chưa gửi kích hoạt**, **Chờ kích hoạt**, **Đang hoạt động**, **Tạm khóa**, **Đã nghỉ việc**. Khôi phục tài khoản chưa kích hoạt không bỏ qua việc xác nhận email. Người dùng không được tự khóa hoặc tự thay vai trò; phải duy trì ít nhất một quản trị hoạt động.

Tạm khóa/nghỉ việc thu hồi các phiên trong database. Cookie cache của Better Auth bị tắt để phiên đã thu hồi không tiếp tục xác thực từ cache. Kiểm tra trạng thái khi tạo phiên cũng áp dụng cho các phương thức đăng nhập cũ.

Khóa tài khoản giữ lại bài nộp, kết quả học, chứng chỉ và lịch sử thao tác. Lịch sử ghi người thực hiện, thời điểm và lý do thay trạng thái. Phòng ban/chức danh/quản lý phục vụ quản trị nội bộ; chưa có đồng bộ với phần mềm nhân sự bên ngoài hoặc SSO trong thay đổi này.

## Giao đào tạo và báo cáo

Khóa học và cohort được lưu bằng quan hệ tới dữ liệu gốc. Việc kích hoạt liên kết hồ sơ, ghi danh và chuẩn bị bản ghi đào tạo bắt buộc cùng một transaction. Nếu ghi danh thất bại, không để lại tài khoản tạo dở hay làm mất liên kết kích hoạt. Có thể giao trước khóa chưa xuất bản; màn hình giao đào tạo đánh dấu **Chưa xuất bản**. Học viên chỉ thấy và mở được khóa đã xuất bản sau khi tài khoản được kích hoạt. Khi xuất bản, khóa đã giao tự xuất hiện mà không cần ghi danh hoặc gửi kích hoạt lại. Gỡ xuất bản ẩn khóa khỏi danh sách học viên và giữ nguyên ghi danh. Bỏ chọn không thu hồi ghi danh đã có hoặc xóa lịch sử; việc thu hồi quyền khóa học dùng chức năng quản lý khóa học hiện hành.

Chi tiết nhân viên hiển thị trạng thái học và thời điểm hoàn thành. Khóa thường tính theo tiến độ hiện có; khóa đào tạo bắt buộc dùng chu kỳ mới nhất. Xuất danh sách áp dụng bộ lọc và phạm vi quyền đang có, bao gồm phạm vi nhân viên trực tiếp của quản lý.

## Nâng cấp và kiểm tra

Áp dụng migration `0043_employee_accounts` theo luồng triển khai hiện hành trước khi chạy API mới. Migration bổ sung bảng, không tạo sẵn mã nhân viên hoặc sửa tài khoản đang có. Kiểm tra `when` của journal cao hơn mọi migration trên nhánh main và không đặt trong tương lai.

Module có nội dung tiếng Việt/Anh. Các locale khác có đầy đủ khóa và tái sử dụng bản dịch sẵn có, dùng tiếng Anh dự phòng cho copy mới khi dịch vụ dịch chưa được cấu hình.

Kiểm thử tích hợp chỉ chạy khi đặt `EMPLOYEE_TEST_DATABASE_URL` trỏ tới database riêng có tên kết thúc `_test`, đã áp dụng schema/migration. Không dùng database đang phục vụ người dùng để chạy fixture:

```sh
pnpm --filter @cio/api exec vitest run src/__tests__/employee-accounts.integration.test.ts
```

Trước khi vận hành với dữ liệu thật, kiểm tra nhận thư qua SMTP thật và luồng HR tạo → nhân viên kích hoạt → đăng nhập bằng mã → học → HR khóa → phiên cũ bị từ chối.


## Học tự chọn và giao đào tạo

**Thư viện đào tạo** chỉ giới thiệu khóa đã xuất bản và đang cho phép nhân viên tự đăng ký. Khóa đã đăng ký vẫn ở thư viện khi còn mở. Đóng tự đăng ký đưa khóa ra khỏi thư viện nhưng giữ quyền và tiến độ người đã tham gia. Xuất bản không tự mở thư viện hoặc tự giao đào tạo.

**Khóa học của tôi** có các bộ lọc Được giao, Tự đăng ký, Bắt buộc và Đã hoàn thành. Một khóa chỉ có một thẻ, kể cả khi có nhiều nguồn tham gia. Nguồn, yêu cầu hoàn thành và hạn học được hiển thị riêng. Khóa thông thường cũng có thể được giao bắt buộc; COMPLIANCE là loại khóa tuân thủ có chu kỳ và hiệu lực, không đồng nghĩa với mọi phân công bắt buộc.

Trong tab **Người học**, chọn **Giao đào tạo**, nhân viên, yêu cầu bắt buộc/khuyến nghị, hạn và lời nhắn. Có thể giao cho người đã tự học mà không đặt lại tiến độ. Gửi lặp giữ nguyên phân công và hạn hiện có. Muốn thay đổi yêu cầu của phân công trực tiếp, hủy rồi giao lại để giữ lịch sử.

Hủy nguồn tham gia chỉ thu hồi quyền từ nguồn đó, không xóa tiến độ, bài làm hoặc chứng chỉ. Quyền từ chương trình/cohort còn hiệu lực vẫn được giữ. Với COMPLIANCE, dùng chức năng miễn trừ/điều chỉnh hạn hiện có; không dùng hủy nguồn để bỏ qua nghĩa vụ tuân thủ. Tab Đội ngũ giảng dạy tách khỏi thống kê người học; tab Lịch sử tham gia giữ các định danh và nguồn đã hủy.

Hồ sơ nhân viên phân biệt lựa chọn phân công trực tiếp với khóa tự đăng ký. Khóa tự chọn vẫn hiển thị trong báo cáo học tập, nhưng không đi vào mẫu số đào tạo bắt buộc. Mục tiêu N trong M khóa vẫn được theo dõi ở chương trình/cohort.

Dữ liệu cũ không đủ bằng chứng được gắn nhãn chưa xác định nguồn; không tự chuyển thành phân công bắt buộc. Triển khai cần chạy migration `0044_learning_sources_and_assignments.sql` bằng quy trình migration hiện có trước khi chạy mã mới. Migration giữ nguyên tiến độ và hồ sơ tuân thủ.


## Course enrollment and employee emails

Course members can only be selected from active employees of the same organization. Search supports employee code, name, and email. New accounts must be created and activated in Employees. Instructors can assign learners; organization administrators assign existing employees with ADMIN or TUTOR roles as instructors.

Course invitation creation and old course invitation links are retired, including acceptance of previously generated course share links. Course access notifications use the editable course access template. Enrollment and removal also synchronize the employee’s course assignments.

Email settings show employee activation, course/cohort access, and learning notifications. Obsolete course invitations, organization invitations, and payment proof templates remain in the internal registry for compatibility but are not editable or listed. Activation sends use the saved organization template, enforced language, branding, and a protected single-use 48-hour action link. Saved organization course access messages take priority over legacy course welcome text.

The translation command currently receives HTTP 401 from the configured RapidAPI provider. English and Vietnamese UI copy is maintained manually; the changed keys in other dashboard locales use English fallback copy. Activation email defaults are localized for every supported email language.
