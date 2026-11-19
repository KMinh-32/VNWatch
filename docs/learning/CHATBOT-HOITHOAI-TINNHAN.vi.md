# Chatbot VNWatch theo ERD HoiThoai – TinNhan

## Chức năng đã triển khai

- Hỏi về đồng hồ, lọc ngân sách/bộ máy, thông số, xuất xứ thương hiệu và chính sách có trong website.
- Tạo hội thoại, lưu câu hỏi/câu trả lời, mở lại lịch sử, kết thúc hội thoại và tạo hội thoại mới.
- Khách chưa đăng nhập được tư vấn; lịch sử gắn với cookie HttpOnly ngẫu nhiên trong trình duyệt (30 ngày). Xóa cookie làm mất quyền truy cập lịch sử khách trên trình duyệt đó.
- Khi đăng nhập, lịch sử gắn với tài khoản. Lịch sử khách và tài khoản được tách riêng, không tự nhập chung.
- Chỉ chủ sở hữu xem/gửi/đóng hội thoại. Thay ID trên URL không cho phép đọc hội thoại khác.
- Gửi lại cùng requestId không tạo tin nhắn trùng. Một hội thoại chỉ xử lý một câu hỏi tại một thời điểm.
- Hiển thị 30 hội thoại gần nhất; mỗi lần đọc tối đa 100 tin nhắn và có nút tải tin nhắn cũ. Sau 1.000 tin nhắn cần tạo hội thoại mới.

## Luồng thực hiện

React Assistant → NestJS AssistantController → ConversationService → PostgreSQL HoiThoai/TinNhan.

1. Backend xác định tài khoản từ Bearer session hoặc khách từ cookie; không nhận MaTK tự khai.
2. Kiểm tra quyền sở hữu, trạng thái hội thoại, mã lượt gửi và chống gửi đồng thời.
3. Lưu TinNhan của user và tạo TinNhan assistant ở trạng thái DANG_XU_LY.
4. Lấy 8 tin nhắn gần nhất từ database; không tin lịch sử do trình duyệt gửi lên.
5. AssistantService đọc catalog công khai hiện tại, kiến thức hãng và chính sách đã duyệt trong mã nguồn.
6. Gọi FastAPI nội bộ. Khi có OPENAI_API_KEY, OpenAI phân tích câu hỏi thành bộ lọc có cấu trúc; ứng dụng dựng câu trả lời từ dữ liệu thực tế. Không có key hoặc provider lỗi thì dùng chế độ CATALOG.
7. Kiểm tra lại ID sản phẩm, SKU và whitelist nguồn; lưu phản hồi, ý định, chế độ, tên mô hình và trạng thái HOAN_THANH. Khi dịch vụ lỗi, ghi LOI để khách gửi lại.
8. React hiển thị trả lời, sản phẩm và nguồn tham khảo. Giá/tồn kho trong lịch sử là bản chụp thời điểm tư vấn; trang sản phẩm cung cấp dữ liệu hiện tại.

## Ánh xạ ERD vào mã nguồn

Hai model Prisma và bảng PostgreSQL tên HoiThoai, TinNhan.

HoiThoai: maHoiThoai, maTK, tieuDe, trangThai, ngayTao, ngayCapNhat.

TinNhan: maTinNhan, maHoiThoai, nguoiGui, noiDung, yDinh, cheDo, tenMoHinh, trangThai, thoiGian.

Điều chỉnh khi triển khai:

- User của dự án dùng UUID nên maTK cũng là UUID; maHoiThoai dùng UUID thay VARCHAR(36), DATETIME được ánh xạ TIMESTAMPTZ.
- HoiThoai thêm guestTokenHash để bảo vệ lịch sử khách và dataKind để không trộn catalog thật/demo.
- TinNhan thêm requestId để chống lưu trùng, duLieuTraLoi JSON để mở lại thẻ sản phẩm/nguồn trong câu trả lời.
- Mỗi hội thoại có đúng một hình thức sở hữu: maTK hoặc guestTokenHash. Một TinNhan thuộc đúng một HoiThoai; không lặp maTK trong TinNhan.
- Chatbot đọc sản phẩm qua catalog; việc đọc không tạo khóa ngoại trực tiếp giữa TinNhan và SanPham.
- Không có migration xóa hoặc thay bảng dữ liệu nghiệp vụ cũ.

## Các file cần đọc

- outputs/vnwatch-backend/prisma/schema.prisma: hai model và quan hệ.
- outputs/vnwatch-backend/prisma/migrations/20261111000000_chat_conversations/migration.sql: tạo bảng, FK, constraint, index.
- outputs/vnwatch-backend/src/assistant/conversation.service.ts: xác thực chủ sở hữu, lịch sử, giao dịch và chống gửi trùng.
- outputs/vnwatch-backend/src/assistant/assistant.controller.ts: API.
- outputs/vnwatch-backend/src/assistant/assistant.service.ts: catalog và gateway FastAPI.
- outputs/vnwatch-agent/consultant.py: phân tích câu hỏi và dựng trả lời có căn cứ.
- outputs/vnwatch-frontend/src/Assistant.tsx: giao diện và lịch sử.

## Chạy và cấu hình

Sau khi cập nhật mã: trong hai thư mục backend/frontend chạy `npm run build`; mở START-VNWATCH.cmd để chạy local tại http://127.0.0.1:5173. Script khởi động áp migration khi backend chưa chạy. Nếu backend đã chạy phiên bản cũ, dừng tiến trình backend của dự án trước khi khởi động lại.

Docker: tại D:\VNWatch chạy `docker compose --env-file .env.docker up -d --build`. Dịch vụ init áp migration trước khi backend chạy; không dùng `down -v` vì sẽ xóa dữ liệu.

Local: điền OPENAI_API_KEY vào outputs/vnwatch-agent/.env, giữ OPENAI_MODEL là model tài khoản có quyền truy cập; khởi động lại agent. Docker: cấu hình .env.docker rồi tạo lại service agent. Không đặt key vào React hoặc gửi qua chat.

Chưa có API key thì CATALOG vẫn tư vấn được theo dữ liệu website. Đây là chế độ quy tắc, không phải phản hồi từ mô hình OpenAI.

OpenAI Responses dùng `store=False`; lịch sử ứng dụng do PostgreSQL quản lý. Tài liệu đối chiếu: https://developers.openai.com/api/docs/guides/conversation-state

## Kiểm thử

- Backend: assistant.integration.test.ts và conversation.integration.test.ts dùng database `_test` cùng schema tạm, có cleanup.
- FastAPI: tests/test_consultant.py dùng provider giả lập, không gọi OpenAI tính phí.
- React: tests/conversation.spec.ts kiểm tra tải lại trang, đổi hội thoại, đóng hội thoại, bố cục mobile và cách ly trình duyệt.

Các API mới nằm dưới /api/v1/assistant: GET/POST conversations, GET conversations/:id/messages, POST conversations/:id/close. POST chat nhận message, conversationId, requestId và dataKind. history cũ vẫn được validate để tương thích nhưng bị bỏ qua; server lấy lịch sử trong DB.
