# Phạm vi quản trị và nghiệm thu

Website có một trang công khai và các popup. Danh mục gồm Tendoo, Viettel-CA, V-Contract, S-Invoice, V-BHXH và FTTH. SIM Data 5G xuất hiện trong poster và lựa chọn tư vấn. Trang /admin có bảy mục.

| Trang hoặc phần hiện có | Dữ liệu hay thao tác đang tĩnh | Chức năng trong admin | Cách kiểm tra |
| --- | --- | --- | --- |
| Liên hệ, thanh chạy, QR TAMMI, chân trang, nút gọi | Tên chuyên viên, hotline, email, địa chỉ, chữ chạy, ảnh đại diện và QR | Liên hệ | Chọn file thay ảnh đại diện, đổi hotline, nội dung chữ chạy hoặc QR rồi tải lại trang khách |
| Poster và ảnh trên sáu thẻ giải pháp | Ảnh, mô tả ảnh, thứ tự poster | Ảnh & poster | Thay ảnh dịch vụ; thêm, ẩn, đổi thứ tự poster và kiểm tra nguồn ảnh điện thoại |
| Góc khám phá | Tên, mô tả và nguồn video | Thêm, sửa, ẩn và sắp xếp trong Video | Thêm một video mới rồi tải lại và mở video đó |
| Phần mở đầu trang chủ | Dòng giới thiệu, tiêu đề chính, dòng nhấn và đoạn giới thiệu | Trang khách → Nội dung đầu trang | Sửa cả bốn trường, lưu và tải lại trang khách để đối chiếu |
| Khu poster, Góc khám phá, FAQ và nội dung bổ sung | Trạng thái hiển thị và danh sách khối trước mục tư vấn | Trang khách | Thử ẩn/bật cả khu và thêm, sửa, ẩn một khối có ảnh |
| Sáu bảng giá | Gói theo nhóm, giá/giá gốc, thời hạn, thông số riêng, thiết bị Tendoo | Thêm, sửa, ẩn, sắp xếp, lọc theo dịch vụ | Sửa giá, thêm gói, ẩn gói; kiểm tra popup và chọn Mua ngay |
| FAQ | 5 câu hỏi và trả lời | Thêm, sửa, ẩn, sắp xếp | Tải lại, kiểm tra câu hỏi, đáp án, thứ tự |
| Form chính và popup theo gói | Gửi thủ công qua TAMMI/email, chưa có danh sách lưu | Nhận yêu cầu, xem mã và trạng thái email, cập nhật xử lý | Thử email lỗi, bỏ trống điện thoại, giới hạn gửi, mã xác nhận, kết quả Resend |

## Kết quả kiểm tra

- Build thành công; các tham chiếu tài sản cục bộ đều có trong đầu ra. Dữ liệu khởi tạo gồm 10 poster, 5 FAQ, 6 dịch vụ và 159 mục gói hoặc thiết bị.
- Đã chạy Chrome với khung nhìn 390 px. Đã kiểm tra đăng nhập sai/đúng, chặn API khi thiếu phiên, đăng xuất, sửa nội dung và tải lại trang khách để đối chiếu, thêm/sửa/ẩn/đổi thứ tự gói và poster, cập nhật FAQ, video và thông tin liên hệ.
- Đã chạy câu lệnh PostgreSQL trên PGlite qua mô phỏng giao thức Neon. Khởi tạo lần hai giữ lại thay đổi đã lưu. Đã thử gửi cả form chính và popup theo gói, bỏ trống số điện thoại, từ chối email hoặc số điện thoại sai, giới hạn gửi, gửi lại cùng mã và cập nhật trạng thái xử lý.
- Sharp tạo WebP thật ở 1600 px và 768 px từ ảnh thử nghiệm. Đã xác nhận upload hai ảnh qua API Blob mô phỏng, lưu hai URL và hiển thị bằng `picture` với nguồn điện thoại riêng.
- Đã kiểm tra **Chưa cấu hình email**, **Gửi lỗi** và **Đã gửi** trên các phản hồi Resend mô phỏng, gồm lưu ID email và giữ bản ghi khi gửi thất bại.

Neon, Vercel Blob, Resend và Vercel Preview thật cần cấu hình và chạy lại các mục tương ứng trước khi bàn giao bản triển khai.
