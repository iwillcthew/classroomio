# Nhân sự và đào tạo MP Learning

## Vận hành

Mở **Nhân sự và đào tạo** trong menu quản trị hoặc tại `/lms/workforce`. Quản trị hệ thống và HR có thể quản lý nhân viên; trưởng đơn vị và quản lý trực tiếp xem nhân sự, báo cáo trong phạm vi của mình. Nhân viên xem đào tạo cá nhân.

MP sử dụng mã nhân viên và mật khẩu. Chưa cấu hình SSO hoặc kết nối HRIS, theo lựa chọn của người dùng.

### Cấp tài khoản

1. Chọn **Nhân viên → Thêm nhân viên**.
2. Nhập mã NV, họ tên, email; chọn đơn vị, chức danh và quản lý nếu cần.
3. Chọn **Lưu nháp** hoặc **Tạo và gửi kích hoạt**.
4. Nhân viên mở liên kết trong email, đặt mật khẩu và đăng nhập bằng mã NV.

Mã NV được chuẩn hóa thành chữ hoa, giữ số 0 đầu, có từ 1 đến 40 ký tự chữ Latin, số, dấu chấm, gạch dưới hoặc gạch nối. Mã là duy nhất trên hệ thống, không đổi và không được cấp lại cho người khác. API không nhận thay đổi mã; cơ sở dữ liệu cũng chặn thay đổi mã, tổ chức hoặc liên kết định danh.

Email dùng để kích hoạt và khôi phục mật khẩu. Nhân viên đã được quản lý bằng mã NV không đăng nhập trực tiếp qua endpoint email. Tài khoản quản trị cũ chưa được gắn mã NV vẫn sử dụng email để chuyển tiếp hệ thống; HR có thể thêm hồ sơ bằng đúng email hiện có để liên kết mà giữ tài khoản và kết quả học.

Liên kết kích hoạt dùng một lần, hết hạn sau 48 giờ. Gửi lại liên kết hủy liên kết cũ. Việc đưa thư vào hàng đợi và việc nhân viên nhận thư là hai trạng thái khác nhau. Cần Redis, worker jobs và SMTP hoạt động; giao diện báo rõ nếu chưa đưa được thư vào hàng đợi.

Tài khoản đang chờ kích hoạt, tạm khóa hoặc nghỉ việc không được tạo phiên đăng nhập. Tạm khóa/nghỉ việc thu hồi phiên hiện có và chặn quyền học; giữ nguyên lịch sử và mã NV. Không thể tự khóa tài khoản hoặc tự đổi vai trò. HR không được sửa tài khoản quản trị hệ thống hoặc gắn mã NV vào tài khoản quản trị viên. Không nhận định danh đã thuộc tổ chức khác, vì trạng thái nhân viên chi phối quyền đăng nhập của định danh đó.

### Đơn vị và chức danh

Trong **Cơ cấu và nhập danh sách**, khai báo chức danh và đơn vị. Mỗi đơn vị có đúng một trưởng đơn vị là nhân viên đang hoạt động thuộc đơn vị đó. Để khởi tạo đơn vị đầu tiên, tạo và kích hoạt nhân viên trước, sau đó chọn người đó làm trưởng đơn vị; hệ thống gắn họ vào đơn vị trong cùng giao dịch.

Quản lý trực tiếp được chỉ định riêng nếu cần. Khi để trống, hệ thống lấy trưởng đơn vị hiện tại; trưởng đơn vị không tự báo cáo cho chính mình. Mặc định này được tính từ dữ liệu hiện tại, nên đổi trưởng đơn vị cũng cập nhật người quản lý mặc định. Hệ thống chặn vòng lặp quản lý và yêu cầu thay trưởng đơn vị/người quản lý trước khi khóa hoặc điều chuyển người đang phụ trách.

Đổi đơn vị, chức danh, quản lý, vai trò hoặc trạng thái phải nhập lý do. Lịch sử lưu người thao tác, thời điểm và giá trị trước/sau.

### Nhập danh sách

Hỗ trợ CSV UTF-8, tối đa 1.000 dòng và 5 MB; có thể xuất CSV từ Excel. Các cột:

```csv
employeeCode,fullname,email,unitCode,jobTitleCode,managerCode
MP001,Nguyễn Văn An,an@example.com,OPS,SPECIALIST,
```

`employeeCode`, `fullname`, `email` là bắt buộc. Mã đơn vị, chức danh, quản lý phải tồn tại trước khi nhập. Kiểm tra bản xem trước; dòng trùng mã/email, sai quan hệ hoặc không hợp lệ bị đánh dấu. Lượt nhập trả kết quả từng dòng, không âm thầm bỏ lỗi. Các dòng nhập hợp lệ và việc giao đào tạo được ghi cùng giao dịch; email chỉ được xếp hàng sau khi dữ liệu đã được lưu.

Lời mời và ghi danh trước đây theo email được liên kết vào tài khoản mới, tránh tạo bản sao.

## Giao đào tạo

**Quy tắc và lộ trình** cho phép chọn đơn vị, chức danh và các khóa học/bài kiểm tra/lộ trình. Nếu chọn cả đơn vị và chức danh, nhân viên phải đáp ứng cả hai; để trống một điều kiện thì điều kiện đó áp dụng cho tất cả.

Quy tắc được áp dụng khi lưu quy tắc, tạo/nhập/kích hoạt nhân viên, điều chuyển, đổi chức danh, mở lại tài khoản hoặc cập nhật đơn vị/lộ trình. Khóa học, bài kiểm tra và lộ trình không được giao trùng. Tắt quy tắc dừng giao cho người mới; không xóa lịch sử hoặc kết quả đã có.

Lộ trình gắn với chức danh, gồm các khóa học theo thứ tự khuyến nghị do HR sắp xếp. Nhân viên xem lộ trình và tiến độ tại **Đào tạo của tôi**. Khi điều chuyển, hệ thống bổ sung yêu cầu mới, giữ các lượt giao và kết quả cũ. Cập nhật nội dung của lộ trình cũng cập nhật quyền học cho những người đã được giao lộ trình đó.

Bài kiểm tra/kỳ thi tận dụng exercise và cơ chế nộp/chấm bài sẵn có. Giao bài kiểm tra cấp quyền vào khóa học chứa bài đó; việc cấp quyền này không tự biến cả khóa học thành yêu cầu bắt buộc. Các hạn, số lần làm bài và điều kiện đạt tiếp tục theo cấu hình exercise hiện có.

## Tìm kiếm và báo cáo

Tìm theo mã NV, tên, email, tên đơn vị hoặc chức danh. Bộ lọc đơn vị/chức danh có trong màn nhân sự, quy tắc/lộ trình, báo cáo đơn vị, phân tích đào tạo, danh sách học viên/thành viên khóa học/cohort, nhóm quản trị, bảng chấm bài và danh sách tuân thủ của tổ chức/khóa học. Các danh sách phân trang hiện có giữ bộ lọc trong URL và truyền xuyên suốt đến truy vấn, đếm, xuất danh sách và chọn đối tượng hàng loạt. Nhóm quản trị, bảng chấm bài và bảng tuân thủ lọc tập dữ liệu đã được phân quyền bằng danh sách định danh do API kiểm tra quyền trả về; khi đổi bộ lọc tuân thủ, hệ thống xóa lựa chọn hàng loạt trước đó.

Báo cáo đơn vị so sánh số nhân viên đang hoạt động, yêu cầu được giao, hoàn thành, chưa hoàn thành và tỷ lệ hoàn thành; hỗ trợ xuất CSV. Báo cáo dùng đơn vị hiện tại của nhân viên. Mỗi yêu cầu khóa học hoặc bài kiểm tra là một lượt; phần bao lộ trình không cộng thêm lượt. Đơn vị chưa có yêu cầu được giao hiển thị trạng thái riêng, không đánh đồng với tỷ lệ hoàn thành 0%.

Hoàn thành khóa học được tính từ tiến độ nội dung và dữ liệu hoàn thành hiện có. Bài kiểm tra dùng chung điều kiện hoàn thành/đạt của exercise. Trưởng đơn vị chỉ xem đơn vị mình phụ trách; quản lý được chỉ định chỉ xem nhân viên thuộc phạm vi của mình.

## Migration và xác minh

Thay đổi nằm trong một migration `0042_workforce.sql`. Số 0039 đã được upstream sử dụng; 0040 và 0041 cũng đã tồn tại trên `origin/main` khi kiểm tra, nên tính năng dùng số 0042. Mốc `when` của migration mới lớn hơn mốc mới nhất của `origin/main`. Khi đồng bộ upstream, phải giải quyết journal theo thứ tự và chạy các migration còn thiếu trước 0042; không đưa migration cũ hơn vào sau high-water mark đã triển khai.

Không chạy kiểm thử bằng dữ liệu nhân viên thật. `scripts/verify-workforce.mjs` tạo database kiểm tra riêng trên container PostgreSQL local, sao chép cấu trúc không có dữ liệu, áp dụng migration, dựng dữ liệu giả và tự xóa database kiểm tra sau khi kết thúc.

```powershell
pnpm --filter @cio/api^... build
pnpm --filter @cio/api build
pnpm --filter @cio/dashboard^... build
pnpm --filter @cio/dashboard build
node scripts/verify-workforce.mjs
```

Dùng Node 24.22.1. Build dashboard cần heap khoảng 8 GB theo hướng dẫn triển khai của repo. Kiểm thử giao diện tại `scripts/verify-workforce-ui.mjs` dùng tài khoản thử local đã có trong `.env.local`, Edge headless và API nhân sự giả lập; không gửi thư hay chỉnh dữ liệu nhân sự thật. Kết quả và ảnh QA nằm dưới `reports/workforce/`, không đưa cookie hoặc secret vào Git.

Đã xác minh build API/dashboard, 64 kiểm thử dashboard, 22 kiểm thử API liên quan và 24 kịch bản tích hợp PostgreSQL riêng. Kiểm tra kiểu dữ liệu toàn dashboard vẫn báo 317 lỗi ngoài các module nhân sự và luồng đăng nhập/kích hoạt mới; đây chưa phải một bản kiểm tra kiểu dữ liệu sạch cho toàn repository. Không áp dụng migration vào database vận hành trong quá trình kiểm thử. Khi triển khai, chạy migration trước API/dashboard mới và xác minh worker/SMTP bằng một tài khoản thử được phép nhận thư.

Ngôn ngữ đầy đủ cho phần mới là tiếng Việt và tiếng Anh. Những locale còn lại dùng bản dịch có sẵn của câu tương đương hoặc tiếng Anh dự phòng; các khóa và placeholder được đồng bộ. Dịch tự động qua dịch vụ cấu hình trong repo chưa thành công trong môi trường kiểm tra.
