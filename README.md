# Website Viettel Đồng Nai

Landing page hiện có dùng HTML/CSS/JS và Vercel Functions (Node.js 22). Neon lưu nội dung, phiên quản trị và yêu cầu tư vấn. Trang quản trị có một tài khoản dùng biến môi trường.

## Khởi tạo và chạy

1. Cài Node.js 22, chạy `npm ci`.
2. Tạo Neon Postgres và đặt connection string vào `DATABASE_URL` trong `.env.local` theo [.env.example](.env.example). Chạy `npm run db:init`. Lệnh có thể chạy lại vì chỉ thêm mục nội dung còn thiếu.
3. Tạo tên đăng nhập `ADMIN_USERNAME`. Sinh `ADMIN_PASSWORD_HASH` bằng `npm run admin:hash`. Gõ mật khẩu 12–200 ký tự trên terminal riêng, nhấn Enter rồi kết thúc stdin bằng Ctrl+Z và Enter trên Windows, hoặc Ctrl+D trên macOS/Linux. Chép **chuỗi hash** vào biến môi trường. Terminal có thể hiện ký tự nhập trong bước này.
4. Tạo **Public** Blob store và nối với dự án Vercel. Đặt `BLOB_READ_WRITE_TOKEN` nếu chạy upload ở máy local. Admin nhận ảnh JPG, PNG hoặc WebP tối đa 10 MB, tạo bản WebP rồi gửi thẳng lên Blob qua link tải có hạn. Banner được tạo WebP rộng tối đa 1600 px và 768 px, giữ tỷ lệ ảnh.
5. Để gửi email, xác minh domain gửi trong Resend và đặt `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. Khách nhận email xác nhận. Địa chỉ **Admin → Liên hệ → Email liên hệ** nhận email thông báo kèm thông tin khách điền.
6. Chạy `npm run build`, rồi `npm run dev`. Mở `http://127.0.0.1:3000/` và `/admin`. Trang công khai có nội dung khởi tạo dự phòng khi Neon chưa kết nối. Form yêu cầu kết nối Neon.

## Tạo Vercel Preview riêng tư

1. Đưa thư mục mã nguồn hiện tại lên repo riêng và import repo đó vào Vercel. Dùng cấu hình trong `vercel.json` và Node.js 22. Cấu hình build phân phối web từ `dist` và triển khai các hàm trong `api`.
2. Trong **Settings → Deployment Protection**, bật **Standard Protection / Vercel Authentication** cho các deployment Preview. Chỉ cấp quyền cho tài khoản Vercel được phép mở bản xem trước. Quyền xem Preview độc lập với tài khoản `/admin`.
3. Tạo nhánh Neon riêng cho Preview. Đặt các biến theo `.env.example` trong phạm vi **Preview**. Nối Blob store với môi trường đó. Dùng connection string Preview để chạy `npm run db:init` trước khi thử các form.
4. Push lên nhánh thử nghiệm để Vercel tạo Preview. Mở URL ở cửa sổ đăng xuất để xác nhận Vercel chặn truy cập, sau đó mở bằng tài khoản được cấp quyền và thử `/admin`.
5. Với Resend, dùng domain gửi đã xác minh và địa chỉ người nhận thử nghiệm mà bạn kiểm soát. Để trống biến Resend nếu chỉ cần thử trạng thái **Chưa cấu hình email**.

[Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) · [Vercel Blob](https://vercel.com/docs/vercel-blob) · [Neon](https://neon.com/docs/serverless/serverless-driver) · [Resend](https://resend.com/docs/api-reference/emails/send-email)

## Nghiệm thu

Trang quản trị gồm **Liên hệ**, **Ảnh & poster**, **Gói cước**, **Yêu cầu tư vấn**, **FAQ**, **Video** và **Trang khách**.

Trong mục **Video**, có thể thêm nhiều clip, sắp xếp và bỏ chọn **Hiển thị** để ẩn. Ô **Link video** nhận link YouTube, ID YouTube hoặc đường dẫn MP4.

Trong **Trang khách**, có thể bật/tắt toàn bộ khu Poster, Góc khám phá và FAQ. Khối nội dung mới gồm tiêu đề, nội dung và ảnh tùy chọn, hiển thị trước phần đăng ký tư vấn. Các tùy chỉnh mới được lưu khi xuất bản lần đầu, kể cả trên database đã khởi tạo.

Trong **Liên hệ**, chọn file để thay ảnh đại diện. Ô **Nội dung chữ chạy** là phần chữ đứng sau tên đơn vị, địa chỉ và hotline tự lấy từ thông tin liên hệ. Trong các danh sách nội dung, **Xóa** loại mục khỏi danh sách sau khi bấm **Lưu và xuất bản**. Bỏ chọn **Hiển thị** để ẩn và có thể bật lại sau.

Dùng [bảng phạm vi và nghiệm thu](PHAM-VI-QUAN-TRI.md) để đối chiếu từng mục. Trong Gói cước, chọn dịch vụ trước khi thêm hay sắp xếp. Thứ tự áp dụng trong nhóm đang hiển thị ở bảng giá. Trong Yêu cầu tư vấn, trạng thái xử lý độc lập với kết quả gửi email. **Đã gửi** nghĩa là Resend đã nhận yêu cầu và trả ID.

Trong danh sách yêu cầu, cột **Email xác nhận** theo dõi email gửi cho khách. Lỗi gửi thông báo cho chủ web được ghi vào log Vercel theo mã yêu cầu.

Việc sửa giá và nội dung được xuất bản khi bấm **Lưu và xuất bản**. Tải ảnh lên trước, sau đó bấm lưu để áp dụng URL mới. Liên kết hình ảnh dùng Blob công khai để trình duyệt tải được. Chỉ tải tài sản dùng cho website.
