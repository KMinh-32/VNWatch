# VOPC chatbot AI theo mẫu lớp phân tích

File `VNWatch-ChatbotAI-VOPC-Entity.drawio` có hai trang: **VOPC theo mẫu** (nền tối, giống ảnh tham khảo) và **VOPC nền trắng** (để đưa vào báo cáo). Các lớp gồm ba ngăn: stereotype/tên lớp, thuộc tính và phương thức. Các lớp và đường nối sửa được trong draw.io; nội dung được nhóm theo lớp để di chuyển cùng nhau.

## Thành phần

- Actor **Khách hàng** sử dụng `ChatbotForm`.
- Boundary **ChatbotForm** quản lý cửa sổ, câu hỏi nhập và nội dung hiển thị; gọi `ChatbotController`.
- Control **ChatbotController** quản lý ngữ cảnh, kiểm tra chủ phiên, truy vấn Entity, gọi phân hệ AI và kiểm tra/lưu kết quả.
- Actor **Hệ thống AI** là phân hệ tư vấn (FastAPI, cùng OpenAI nếu cấu hình), hỗ trợ Controller; không tự truy cập hay ghi các Entity.
- **8 Entity** tham gia trực tiếp hoặc hỗ trợ use case, ánh xạ vào ERD đã gộp.

| Entity | Bảng ERD | Trách nhiệm trong chatbot |
| --- | --- | --- |
| `TaiKhoan` | `taikhoan` | Nhận diện khách đã đăng nhập, kiểm tra trạng thái tài khoản và gắn quyền sở hữu phiên. Khách vãng lai có `MaTK = NULL` ở phiên. |
| `PhienChat` | `phienchat` | Tạo/lấy phiên, kiểm tra chủ phiên, cập nhật thời gian và đóng phiên. |
| `TinNhanChat` | `tinnhanchat` | Lưu câu hỏi, câu trả lời, lịch sử, ý định, chế độ và metadata. |
| `DanhMuc` | `danhmuc` | Cung cấp thông tin phân loại và nhóm sản phẩm phù hợp khi khách có tiêu chí danh mục. |
| `SanPham` | `sanpham` | Tìm sản phẩm theo tiêu chí; cung cấp tên, thương hiệu, giá, tồn kho, hình đại diện và thông số. |
| `KienThucChatbot` | `kienthucchatbot` | Đọc thông tin thương hiệu/chính sách/hướng dẫn đã được duyệt; cung cấp nguồn của kiến thức đó. |
| `SanPhamGoiY` | `sanphamgoiy` | Lưu/lấy các sản phẩm liên kết với một câu trả lời, thứ tự và lý do. |
| `NguonTraLoi` | `nguontraloi` | Lưu/lấy nguồn và bản chụp nội dung mà câu trả lời đã sử dụng. |

Các tên Entity và thuộc tính được đối chiếu với `VNWatch-ERD-day-du.json`. Thuộc tính hiển thị ở dạng camelCase như ảnh mẫu. `?` là nullable; `{PK}` và `{FK}` nhắc lại vai trò khóa trong ERD. VOPC chỉ cần các thuộc tính phục vụ use case nên không chép toàn bộ trường đăng nhập/tài khoản hoặc giá vốn.

## Quan hệ với sequence theo mẫu

Sáu Entity `PhienChat`, `TinNhanChat`, `SanPham`, `KienThucChatbot`, `SanPhamGoiY`, `NguonTraLoi` chính là các đường sống Entity trong sequence cơ bản đã vẽ. `TaiKhoan` và `DanhMuc` mở rộng phạm vi phân tích để bao quát ngữ cảnh khách đã đăng nhập, quyền chủ phiên và tiêu chí phân loại. Sequence mở phiên mới có thể dùng sẵn danh tính từ ngữ cảnh đăng nhập nên không truy vấn lại tài khoản tại từng lượt.

Sơ đồ dùng association nét liền như ảnh mẫu giữa Actor → Boundary → Control và Control → Entity/actor AI. Đây là các lớp tham gia use case; các FK, lực lượng số và quan hệ chi tiết giữa Entity đã được thể hiện trong ERD riêng.

`SanPham.hinhAnh` cung cấp hình đại diện của thẻ gợi ý trong use case này. Thư viện nhiều ảnh hoặc đánh giá sản phẩm có thể bổ sung Entity tương ứng nếu mở rộng luồng tư vấn để đọc trực tiếp những dữ liệu đó. Luồng hiện tại trả lời về chính sách bảo hành/giao hàng từ `KienThucChatbot` đã duyệt, không truy vấn hồ sơ bảo hành/đơn hàng riêng tư.

Khi triển khai, `ChatbotController` là lớp điều khiển phân tích; các trách nhiệm có thể tách thành controller, service và repository trong NestJS. Phương thức trên Entity mô tả trách nhiệm truy cập dữ liệu trong mô hình phân tích, không có nghĩa bảng SQL có các phương thức đó. Tên này nhất quán với `ChatbotForm`, `ChatbotController` trong sequence Entity.

Chỉ sử dụng kiến thức `DA_DUYET`, kiểm tra ID sản phẩm/nguồn với dữ liệu đã cung cấp, lưu câu trả lời + gợi ý + nguồn + thời gian phiên trong một transaction, và chỉ trả thành công sau COMMIT. Khách vẫn phải đăng nhập để thêm vào giỏ và đặt hàng theo luồng mua hàng riêng.

Đây là bản thiết kế theo ERD mới; phần lưu chatbot chưa phải migration đã áp dụng vào database đang chạy.
