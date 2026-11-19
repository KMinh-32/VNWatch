# VOPC và Sequence chatbot AI — bản đối chiếu nghiệp vụ và ERD

Bản cập nhật ngày 02/11/2026, dựa trên ERD gộp 17 bảng đã gửi trong cuộc trao đổi. Đây là thiết kế phân tích cho use case **chatbot tư vấn đồng hồ, thương hiệu và thông tin công khai của website**. Các lớp Entity và quan hệ dữ liệu lấy từ [dữ liệu ERD gộp](../../chatbot-erd/VNWatch-ERD-day-du.json).

## Mở file nào?

Mở **`VNWatch-ChatbotAI-VOPC-Sequence.drawio`** bằng draw.io/diagrams.net. File có năm trang:

1. **01 VOPC:** lớp giao diện, lớp điều khiển, tám Entity và các quan hệ.
2. **02 Sequence — mở phiên:** mở mới hoặc tiếp tục hội thoại, xác định khách, kiểm tra quyền và tải lịch sử.
3. **03 Sequence — tư vấn:** một lượt hỏi đáp, tra cứu dữ liệu, gọi AI, dự phòng và trả kết quả.
4. **04 Sequence — lưu kết quả:** chi tiết `ref` trong trang trước; lưu bằng một transaction và dừng ngay nếu có lỗi.
5. **01b VOPC nền tối:** cùng nội dung VOPC, nền tối theo mẫu đã gửi.

Các file PNG để đưa vào báo cáo, SVG để phóng to. File `.drawio` chứa các lớp, nhãn, mũi tên và đường sống chỉnh sửa được, không phải ảnh nhúng. Có thêm file VOPC riêng và Sequence riêng nếu muốn tách tài liệu.

## Những điểm đã sửa so với các bản trước

- **Bỏ giả định Controller sở hữu một tập Entity cố định.** Controller điều phối use case. Quan hệ `«use»` có mũi tên nét đứt từ Controller tới Entity diễn tả việc sử dụng; không có lực lượng số suy ra từ ERD cho Controller. Vẫn giữ đủ tám đường Controller–Entity.
- **Quan hệ Entity–Entity giữ theo khóa ngoại của ERD**, có tên và lực lượng số ở hai đầu. Không biến FK thành quan hệ kế thừa hoặc composition.
- **Kiểm tra quyền ở cả lúc mở phiên và lúc gửi câu hỏi.** Tài khoản lấy từ ngữ cảnh xác thực của backend. Không tin `MaTK` do trình duyệt tự khai báo. Khách vãng lai có `MaTK=NULL`; cần token phiên khách được backend ký/kiểm tra và ràng buộc với `MaPhien`. Đây là cơ chế truy cập cần có khi triển khai, không phải cột mới tự thêm vào ERD.
- **Các lỗi kết thúc đúng luồng.** `break` kiểm tra chủ phiên nằm ngoài nhánh tạo/tải phiên; lỗi lưu dừng toàn bộ interaction lưu kết quả. Không đi tiếp đến thông báo thành công sau khi bị từ chối hoặc rollback.
- **Gợi ý và nguồn tham chiếu `MaTNAI`**, tức mã của tin trả lời mới. Không gắn chúng vào mã tin khách.
- **Transaction bắt đầu sau khi nhận và kiểm tra kết quả tư vấn.** Không giữ giao dịch database trong thời gian chờ AI. Chỉ trả kết quả thành công sau COMMIT. Không dùng ký hiệu UML `critical` để thay thế giao dịch database.

## Tám Entity được dùng

| Entity / bảng ERD | Trách nhiệm trong use case |
| --- | --- |
| `TaiKhoan` / `taikhoan` | Xác định khách đã đăng nhập, kiểm tra trạng thái tài khoản. Quan hệ người duyệt kiến thức cũng tham chiếu bảng này. |
| `PhienChat` / `phienchat` | Tạo/tải phiên, cung cấp chủ phiên và trạng thái, cập nhật thời điểm hoạt động. |
| `TinNhanChat` / `tinnhanchat` | Lưu câu hỏi, đọc lịch sử trước câu hỏi hiện tại, lưu câu trả lời cùng metadata. |
| `DanhMuc` / `danhmuc` | Tìm danh mục và danh mục con liên quan tiêu chí tư vấn. |
| `SanPham` / `sanpham` | Cung cấp thông tin thật: thương hiệu, giá, tồn kho, thông số và ảnh. |
| `KienThucChatbot` / `kienthucchatbot` | Cung cấp nội dung thương hiệu, chính sách và hướng dẫn đã được admin duyệt. |
| `SanPhamGoiY` / `sanphamgoiy` | Liên kết tin AI với các sản phẩm được gợi ý; lưu thứ tự và lý do. |
| `NguonTraLoi` / `nguontraloi` | Lưu nguồn và bản chụp nội dung dùng cho từng câu trả lời. |

VOPC chỉ liệt kê các thuộc tính liên quan đến use case, không sao chép toàn bộ cột nhạy cảm của tài khoản. `SanPham.HinhAnh` đủ cho thẻ gợi ý nên không cần gọi `HinhAnhSanPham` để lấy album. `ThuongHieu` là thuộc tính của `SanPham` trong ERD hiện tại, không tự tạo thêm Entity thương hiệu.

`DonHang`, `ChiTietDonHang`, `GioHang`, `ThanhToan`, `BaoHanh`, `MaGiamGia`, `LichSuDonHang`, `DanhGiaSanPham` thuộc các nghiệp vụ khác. Use case này có thể hướng khách đến trang mua hàng nhưng không thực hiện đặt hàng, thanh toán, cập nhật kho hoặc truy cập đơn hàng cá nhân. Giỏ hàng và mua hàng tiếp tục yêu cầu đăng nhập.

## Quan hệ dữ liệu giữ nguyên

| Mã ERD | Quan hệ | Giải thích |
| --- | --- | --- |
| R01 | `DanhMuc 0..1 — 0..* DanhMuc` | Một danh mục con có tối đa một cha. |
| R02 | `DanhMuc 1 — 0..* SanPham` | Một sản phẩm thuộc một danh mục. |
| R17 | `TaiKhoan 0..1 — 0..* PhienChat` | Phiên của khách vãng lai không có tài khoản. |
| R18 | `TaiKhoan 0..1 — 0..* TinNhanChat` | Tin AI/hệ thống hoặc khách vãng lai có `MaTK=NULL`. |
| R19 | `PhienChat 1 — 0..* TinNhanChat` | Mỗi tin thuộc đúng một phiên. |
| R20 | `TaiKhoan 0..1 — 0..* KienThucChatbot` | Người duyệt có thể chưa có khi bản kiến thức còn là nháp. |
| R21 | `TinNhanChat 1 — 0..* SanPhamGoiY` | Mỗi dòng gợi ý thuộc một tin trả lời. |
| R22 | `SanPham 1 — 0..* SanPhamGoiY` | Mỗi dòng gợi ý trỏ đến một sản phẩm. |
| R23 | `TinNhanChat 1 — 0..* NguonTraLoi` | Mỗi nguồn được lưu cho một tin trả lời. |
| R24 | `KienThucChatbot 0..1 — 0..* NguonTraLoi` | Nguồn trang sản phẩm có thể không trỏ đến một bản kiến thức. |

R20 là liên kết dữ liệu với người duyệt; hành động duyệt nội dung thuộc use case quản trị và không được thực hiện khi khách gửi câu hỏi. Kiến thức đã duyệt phải có người duyệt là admin và ngày duyệt theo quy tắc nghiệp vụ.

## Cách đọc luồng tư vấn

Sequence 02 mô tả **một lượt** trong phiên đã mở. Mỗi câu hỏi mới chạy lại interaction này. Controller kiểm tra dữ liệu và quyền, lưu câu hỏi, lấy lịch sử trước câu hỏi để tránh lặp nội dung khi gửi AI. Tùy chủ đề, Controller lấy catalog, danh mục và kiến thức đã duyệt. Hệ thống AI là phân hệ tư vấn nhận ngữ cảnh được cấp; không tự truy cập các Entity.

Kết quả có sản phẩm và nguồn phải được đối chiếu với dữ liệu đã tra cứu. Chỉ gợi ý mua sản phẩm đang bán và còn hàng; vẫn có thể trả lời câu hỏi về sản phẩm hết hàng bằng thông tin đúng. Ngoài phạm vi, không đủ dữ liệu, chưa cấu hình AI hoặc AI lỗi đều có nhánh xử lý rõ ràng. Không biến lỗi truy vấn database thành thông báo “không có sản phẩm”.

Sequence 03 lưu tin AI, các gợi ý, nguồn và cập nhật phiên trong cùng transaction context. `SanPhamGoiY` dùng PK ghép `(MaTN, MaSP)`, thứ tự dương và không trùng thứ tự trong một tin. `NguonTraLoi` giữ bản chụp nội dung đã dùng; `MaKT` có thể NULL. Lỗi ở bất kỳ bước nào dẫn đến rollback và trả lỗi; tin khách đã lưu trước đó vẫn còn. Một lượt tư vấn không có gợi ý hoặc nguồn thì không tạo dòng con cho phần đó.

`CheDo=CATALOG` và `TenMoHinh=NULL` mô tả trả lời bằng dữ liệu website; `CheDo=OPENAI` có thể kèm tên mô hình. Các giá trị như `HOAN_TAT`, `KHACH_HANG` là tên mã nghiệp vụ trong bản thiết kế; khi triển khai cần thống nhất với enum của ứng dụng.

## Phân tích và triển khai

Tên `ChatbotForm`, `ChatbotController` và Entity được giữ theo mẫu bài phân tích. Các lời gọi vào Entity là thao tác truy cập/nghiệp vụ dữ liệu của lớp phân tích; khi triển khai sẽ đi qua service/repository. Những thao tác BEGIN/COMMIT/ROLLBACK do tầng persistence thực hiện theo điều phối nghiệp vụ, không cần viết SQL trong HTTP controller.

Ứng dụng hiện tại dùng React → NestJS `AssistantController`/`AssistantService` → FastAPI, với OpenAI tùy cấu hình. Phần lưu phiên/tin nhắn/gợi ý/nguồn trong ERD mở rộng vẫn là **thiết kế đề xuất**, chưa được migration vào database đang chạy. Lần cập nhật này chỉ tạo tài liệu.

Ký hiệu dependency/Usage `«use»` được đối chiếu mục 7.7.4 của [OMG UML 2.5.1](https://www.omg.org/spec/UML/2.5.1/PDF). Các quy tắc nghiệp vụ và việc chọn Entity ở trên được suy ra từ ERD và phạm vi VNWatch trong cuộc trao đổi, không phải yêu cầu riêng của chuẩn UML.
