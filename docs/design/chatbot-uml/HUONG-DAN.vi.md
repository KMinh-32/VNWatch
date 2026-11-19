# VOPC và sequence của chatbot AI VNWatch

Hai sơ đồ thiết kế chức năng **tư vấn sản phẩm, thương hiệu và chính sách theo dữ liệu website**, dựa trên ERD gộp 17 bảng. Các lớp/luồng lưu lịch sử, phiên và nguồn thể hiện thiết kế cần triển khai thêm; chưa phải chức năng lưu database đã có trong mã nguồn hiện tại.

Mở `VNWatch-ChatbotAI-UML.drawio` bằng diagrams.net/draw.io. File có **hai trang VOPC và Sequence** ở thanh trang phía dưới. Có thêm file `.drawio` riêng cho từng sơ đồ, ảnh PNG độ phân giải cao, SVG và nguồn Mermaid `.mmd`.

## VOPC: vai trò các lớp

| Nhóm | Lớp | Vai trò |
| --- | --- | --- |
| Actor | Khách hàng | Hỏi về sản phẩm, thương hiệu, giá, tồn kho hoặc chính sách; có thể chưa đăng nhập. |
| Boundary | `GiaoDienChat` | React nhận câu hỏi, gửi API, hiển thị câu trả lời/sản phẩm/nguồn. |
| Control | `DieuKhienChat` | Lớp điều khiển logic của use case; khi triển khai tách thành `AssistantController` và `AssistantService` tại NestJS. Kiểm tra yêu cầu/quyền, lấy dữ liệu, gọi agent, kiểm tra kết quả và lưu DB. |
| Control | `BoTuVanAI` | FastAPI phân tích câu hỏi, dùng OpenAI nếu có, hoặc quy tắc dự phòng; dựng trả lời từ ngữ cảnh đã cung cấp. |
| Boundary | `CongOpenAI` | Giao tiếp nhà cung cấp OpenAI; chỉ nhận kế hoạch truy vấn/bộ lọc có cấu trúc. |
| Entity | `TaiKhoan`, `PhienChat`, `TinNhanChat` | Danh tính khách, cuộc hội thoại và tin nhắn. |
| Entity | `SanPham`, `DanhMuc` | Catalog công khai, giá, tồn kho, thương hiệu và phân loại. |
| Entity | `KienThucChatbot` | Nội dung thương hiệu/chính sách/hướng dẫn đã được admin duyệt. |
| Entity | `SanPhamGoiY`, `NguonTraLoi` | Sản phẩm được đề xuất và nguồn/bản chụp nội dung dùng cho mỗi trả lời. |

Tên lớp PascalCase ánh xạ tương ứng tới tên bảng ERD chữ thường. Đây là các lớp tham gia use case, không phải bản sao nguyên ERD. Thuộc tính được rút gọn theo phần cần đọc; `?` nghĩa là nullable. Quan hệ duyệt kiến thức bởi admin đã nằm trong ERD và là điều kiện đầu vào; chức năng duyệt nội dung là use case quản trị riêng.

Nét đứt có mũi tên là dependency sử dụng; nét liền và lực lượng số là association giữa entity. `CongOpenAI` là boundary kết nối; cơ sở dữ liệu không được thêm vào VOPC như một entity nghiệp vụ. Database xuất hiện dưới dạng lifeline trong sequence.

## Sequence: các bước nghiệp vụ

1. React gửi câu hỏi và mã phiên tùy chọn tới **NestJS `/api/v1/assistant/chat`**. Danh tính lấy từ cookie/phiên xác thực, không lấy `MaTK` do khách tự khai trong JSON.
2. Kiểm tra yêu cầu, giới hạn tần suất và chủ phiên. Khách vãng lai dùng thông tin phiên khách được máy chủ xác thực; UUID `MaPhien` không tự cấp quyền đọc lịch sử. Truy cập trái phép trả HTTP 403 và dừng tại khung `break` trước khi ghi tin hoặc gọi AI.
3. Tìm/tạo phiên. Transaction ngắn **T1** ghi tin khách `HOAN_TAT` và tin AI đang chờ `DANG_XU_LY`; trả mã các tin. Tin AI này là bản ghi dùng để cập nhật sau khi xử lý, không tạo thêm một tin AI trùng lặp.
4. Đọc lịch sử hoàn tất trước lượt hiện tại, catalog và các kiến thức `DA_DUYET`. Không đưa bản ghi AI đang chờ vào lịch sử; không thêm câu hỏi mới hai lần khi đã truyền riêng `message`.
5. NestJS gọi FastAPI nội bộ, truyền ngữ cảnh công khai đã chọn. FastAPI/OpenAI không trực tiếp đọc hoặc ghi database. Nội dung riêng tư của tài khoản không thuộc ngữ cảnh gửi nhà cung cấp.
6. FastAPI dùng OpenAI để tạo Plan (ý định, bộ lọc, ID hợp lệ); nếu chưa có cấu hình, provider lỗi hoặc Plan không hợp lệ thì phân tích bằng quy tắc. Chế độ lưu ERD là `OPENAI` hoặc `DU_PHONG`; chế độ catalog của code hiện tại tương ứng `DU_PHONG` trong thiết kế.
7. FastAPI dựng câu trả lời từ dữ liệu đã có. Không đủ dữ liệu thì hỏi rõ thêm hoặc thông báo chưa có dữ liệu. Gợi ý và nguồn có thể là danh sách rỗng; không sinh sản phẩm/nguồn giả.
8. NestJS kiểm tra lại phản hồi, ID và nguồn. Transaction ngắn **T2** cập nhật tin AI thành `HOAN_TAT`, lưu `sanphamgoiy`, `nguontraloi` cùng bản chụp nguồn và cập nhật `phienchat.NgayCapNhat`. Các bước này commit hoặc rollback cùng nhau. Với tin AI, `MaTK` người gửi là NULL.
9. Chỉ sau COMMIT mới trả HTTP 200 và hiển thị nội dung. Phản hồi gồm `MaPhien`, `MaTN` của tin AI, nội dung, sản phẩm, nguồn và chế độ; React dùng `MaPhien` để gửi lượt tiếp theo. Nếu FastAPI lỗi/timeout hoặc kết quả không hợp lệ, cập nhật tin AI thành `LOI` và trả HTTP 503. Nếu T2 lỗi, rollback và trả lỗi lưu dữ liệu; không báo đã lưu thành công.

Không giữ transaction hoặc khóa database trong thời gian chờ AI. Khi triển khai cần tránh xử lý đồng thời nhiều lượt trong cùng phiên làm đảo ngữ cảnh; đây là quy tắc ở backend, không phải bảng bổ sung trong ERD hiện tại.

Các nhánh sai DTO/giới hạn tần suất trả lỗi từ controller trước bước dịch vụ. Sơ đồ chính tập trung vào trường hợp tư vấn, phiên trái quyền, OpenAI dự phòng và lỗi agent. Các bảng đơn hàng/thanh toán không tham gia use case này. Khi khách mở sản phẩm từ gợi ý để mua hàng, website đọc lại giá/tồn hiện tại và yêu cầu đăng nhập theo nghiệp vụ mua hàng.

## Đối chiếu mã nguồn

Kiến trúc HTTP hiện tại là **React → NestJS → FastAPI → OpenAI (tùy cấu hình)**. Mã tham khảo: `D:\VNWatch\outputs\vnwatch-backend\src\assistant\assistant.controller.ts`, `assistant.service.ts` và `D:\VNWatch\outputs\vnwatch-agent\consultant.py`.

Backend hiện tại chưa có các model phiên/tin chatbot trong Prisma; kiến thức thương hiệu/chính sách đang ở `knowledge.ts`. Những phần đọc/ghi bảng chatbot trong hai sơ đồ là thiết kế theo ERD mới, không phải xác nhận đã áp dụng migration.
