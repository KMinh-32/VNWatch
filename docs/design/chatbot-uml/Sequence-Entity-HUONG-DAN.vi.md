# Sequence chatbot AI theo mẫu Boundary – Control – Entity

File `VNWatch-ChatbotAI-Sequence-Entity.drawio` là bản chỉnh sửa được. Ảnh PNG độ phân giải cao và SVG có cùng tên. Đây là **luồng cơ bản** của mô hình phân tích, theo mẫu người dùng gửi.

Thứ tự đường sống từ trái sang phải:

**Khách hàng → ChatbotForm → ChatbotController → PhienChat → TinNhanChat → SanPham → KienThucChatbot → SanPhamGoiY → NguonTraLoi → Hệ thống AI.**

`ChatbotForm` dùng ký hiệu boundary màu xanh dương; `ChatbotController` dùng ký hiệu control màu xanh lá; sáu Entity dùng ký hiệu entity màu vàng. Hai actor ở hai đầu là Khách hàng và Hệ thống AI. Có activation bar, đường sống nét đứt và 29 thông điệp đánh số.

## Ánh xạ Entity vào ERD

| Entity | Bảng | Hoạt động trong luồng |
| --- | --- | --- |
| `PhienChat` | `phienchat` | Tạo phiên bằng danh tính đã có; cập nhật thời gian hoạt động cuối. |
| `TinNhanChat` | `tinnhanchat` | Lưu câu hỏi, đọc lịch sử trước lượt hiện tại, lưu câu trả lời và metadata. |
| `SanPham` | `sanpham` | Tìm các sản phẩm liên quan, cung cấp giá, tồn kho và thương hiệu. |
| `KienThucChatbot` | `kienthucchatbot` | Đọc nội dung thương hiệu/chính sách/hướng dẫn ở trạng thái `DA_DUYET`. |
| `SanPhamGoiY` | `sanphamgoiy` | Lưu các liên kết (`MaTNAI`, `MaSP`), thứ tự và lý do gợi ý. |
| `NguonTraLoi` | `nguontraloi` | Lưu nguồn và bản chụp nội dung cho tin AI; `MaKT` nullable với nguồn trang sản phẩm. |

Tên đường sống chính là tên lớp Entity; không có cột database chung thay cho các Entity. Lời gọi Entity thể hiện thao tác của đối tượng truy cập dữ liệu; các phương thức này sẽ được triển khai qua repository/service tương ứng, không phải gọi trực tiếp một bảng SQL bằng phương thức.

## Diễn tiến

1. Thông điệp 1–6: khách mở chatbot, Form yêu cầu Controller tạo phiên và hiển thị lời chào. `MaTK` lấy từ ngữ cảnh xác thực đã có; khách vãng lai dùng NULL. Do vậy không cần truy vấn lại `TaiKhoan` trong luồng cơ bản này.
2. Thông điệp 7–12: khách gửi câu hỏi; Controller lưu tin khách và đọc lịch sử trước `MaTNKhach`, tránh đưa câu hỏi mới vào ngữ cảnh hai lần.
3. Thông điệp 13–18: Controller lấy catalog liên quan và kiến thức được duyệt, gọi phân hệ AI với ngữ cảnh đó, nhận kết quả tư vấn có cấu trúc.
4. Thông điệp 19: Controller đối chiếu ID sản phẩm và nguồn với dữ liệu đã gửi. Trường hợp không hợp lệ thuộc luồng thay thế và không đi tiếp theo luồng thành công này.
5. Thông điệp 20–27 trong khung `critical`: lưu tin AI, các gợi ý, nguồn và cập nhật phiên bằng **một transaction**. Entity trong các bước này dùng cùng transaction context. Sau bước 27, transaction phải COMMIT thành công mới thực hiện bước 28. Nếu lỗi thì rollback và chuyển sang luồng lỗi, không trả kết quả thành công.
6. Thông điệp 28–29: Form nhận kết quả đã lưu và hiển thị nội dung, thẻ sản phẩm, nguồn. Nếu danh sách gợi ý/nguồn rỗng, các phương thức lưu danh sách không tạo dòng liên kết nào.

`Hệ thống AI` là actor của **phân hệ tư vấn** (FastAPI và OpenAI khi có cấu hình), không chỉ là nhà cung cấp mô hình. Phân hệ đó lập Plan và dựng trả lời từ dữ liệu đã được Controller cung cấp. Nó không tự truy cập/ghi các Entity. `CheDo`, `YDinh`, `TenMoHinh` được lưu cùng câu trả lời khi có dữ liệu; không lưu API key.

Sơ đồ tập trung vào luồng mở phiên mới và hỏi đáp thành công. Các nhánh đọc lại phiên cũ, từ chối quyền truy cập, lỗi AI, fallback và lỗi lưu là các luồng thay thế. Quyền chủ phiên vẫn phải được kiểm tra khi triển khai; mã phiên không tự cấp quyền truy cập.

Đây là tài liệu thiết kế theo ERD mới. Các phương thức lưu phiên/tin nhắn/nguồn trên sơ đồ chưa phải phần lưu chatbot đã có trong database đang chạy.
