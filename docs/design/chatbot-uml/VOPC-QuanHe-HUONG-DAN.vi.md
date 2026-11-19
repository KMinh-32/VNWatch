# VOPC chatbot AI có tên quan hệ và multiplicity

Bản mới: `VNWatch-ChatbotAI-VOPC-QuanHe.drawio`, hai trang nền tối và nền trắng. Có ảnh PNG độ phân giải cao, bản vector SVG, Mermaid và JSON mô tả các quan hệ.

Giữ đủ 8 Entity, `ChatbotForm`, `ChatbotController`, actor Khách hàng và actor Hệ thống AI. Bổ sung đầy đủ **10 quan hệ Entity từ phần ERD tương ứng**, 10 dependency giữa lớp sử dụng và lớp được gọi, cùng một association giao tiếp Khách hàng–Form.

## Cách đọc

- **Nét liền xanh**: association dữ liệu giữa Entity, tên quan hệ và multiplicity ở hai đầu. Mã Rxx trùng mã trong ERD gộp.
- **Nét đứt tím, mũi tên mở**: dependency; đầu mũi tên chỉ lớp/phân hệ được sử dụng. Các liên kết này mang tên hành vi như “lưu gợi ý”, “đọc DA_DUYET”.
- **Nét liền xám**: Khách hàng tương tác với Form.
- `1`: đúng một; `0..1`: không có hoặc có một; `0..*`: không có hoặc có nhiều.

Multiplicity ghi ở gần một lớp cho biết số đối tượng của lớp đó có thể liên kết với **một đối tượng của lớp ở đầu còn lại**. Ví dụ `PhienChat 1 — 0..* TinNhanChat`: một phiên có nhiều tin; mỗi tin thuộc đúng một phiên.

## Các association Entity

| Mã ERD | Quan hệ | Multiplicity ở hai đầu |
| --- | --- | --- |
| R17 | `TaiKhoan` sở hữu `PhienChat` | `TaiKhoan 0..1 — 0..* PhienChat` |
| R18 | `TaiKhoan` là người gửi `TinNhanChat` | `TaiKhoan 0..1 — 0..* TinNhanChat` |
| R19 | `PhienChat` chứa `TinNhanChat` | `PhienChat 1 — 0..* TinNhanChat` |
| R20 | `TaiKhoan` duyệt `KienThucChatbot` | `TaiKhoan 0..1 — 0..* KienThucChatbot` |
| R01 | `DanhMuc` là cha của `DanhMuc` | `DanhMuc cha 0..1 — 0..* DanhMuc con` |
| R02 | `DanhMuc` phân loại `SanPham` | `DanhMuc 1 — 0..* SanPham` |
| R21 | `TinNhanChat` đề xuất `SanPhamGoiY` | `TinNhanChat 1 — 0..* SanPhamGoiY` |
| R22 | `SanPham` được gợi ý qua `SanPhamGoiY` | `SanPham 1 — 0..* SanPhamGoiY` |
| R23 | `TinNhanChat` trích dẫn `NguonTraLoi` | `TinNhanChat 1 — 0..* NguonTraLoi` |
| R24 | `KienThucChatbot` được tham chiếu bởi `NguonTraLoi` | `KienThucChatbot 0..1 — 0..* NguonTraLoi` |

R18 cho phép tin AI/hệ thống/khách vãng lai không gắn tài khoản người gửi. R20 có người duyệt tùy chọn vì kiến thức có thể đang nháp; khi `DA_DUYET`, backend yêu cầu người duyệt có quyền admin và ngày duyệt. R24 tùy chọn vì một nguồn có thể là trang sản phẩm hoặc chính sách nội bộ chứ không tham chiếu bản ghi kiến thức.

`SanPhamGoiY` là Entity nối, nên quan hệ nhiều–nhiều giữa tin trả lời và sản phẩm được triển khai bằng hai association một–nhiều R21/R22. Những association này ánh xạ đúng các FK đã có trong ERD. Quan hệ cha–con danh mục chỉ hợp lệ khi không có chu trình; backend cần kiểm tra quy tắc đó.

Các liên kết Form/Controller/AI diễn tả việc sử dụng trong use case; không gán multiplicity dữ liệu cho những lời gọi dịch vụ này. Thuộc tính và phương thức của các lớp giữ phạm vi như bản VOPC theo mẫu trước.

Đây là tài liệu thiết kế theo ERD mới; phần lưu chatbot chưa phải migration đã áp dụng vào database đang chạy.
