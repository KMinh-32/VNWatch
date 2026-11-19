# Controller liên kết Entity bằng association có hướng

Mở `VNWatch-ChatbotAI-VOPC-ControllerAssociation.drawio`. Có hai trang nền tối và nền trắng. Các đường **nét liền xanh dương có mũi tên từ Controller đến Entity** là các association tham chiếu mới C01–C08, có multiplicity ở hai đầu.

## Điều kiện để dùng cách mô hình này

Một association biểu diễn liên kết giữa các đối tượng. Ở bản phân tích này, một đối tượng `ChatbotController` giữ **ngữ cảnh của một lượt tư vấn trong một phiên đã mở**: phiên hiện tại, khách nếu đã đăng nhập, lịch sử, catalog và các danh sách kết quả. Controller có thuộc tính tham chiếu tương ứng với từng association; sơ đồ đã bổ sung đủ tám thuộc tính đó.

Đây là **giả định thiết kế được lựa chọn**, không phải lực lượng số suy ra từ ERD. Các quan hệ Entity–Entity Rxx tiếp tục lấy theo FK của ERD. Các quan hệ Controller–Entity Cxx biểu diễn tham chiếu trong bộ nhớ của mô hình phân tích; không tạo bảng hoặc FK cho Controller.

## Tám association mới

| Mã | Thuộc tính ở Controller | Entity được tham chiếu | Số Entity trên một Controller |
| --- | --- | --- | --- |
| C01 | `taiKhoan` | `TaiKhoan` | `0..1`: khách vãng lai không có tài khoản |
| C02 | `phienChat` | `PhienChat` | `1`: ngữ cảnh đang gắn với một phiên đã mở |
| C03 | `lichSuHoiThoai` | `TinNhanChat` | `0..*`: tập tin nhắn liên quan |
| C04 | `danhMucLienQuan` | `DanhMuc` | `0..*`: các danh mục phục vụ tiêu chí tư vấn |
| C05 | `sanPhamLienQuan` | `SanPham` | `0..*`: các sản phẩm lấy làm ngữ cảnh/gợi ý |
| C06 | `kienThucSuDung` | `KienThucChatbot` | `0..*`: các nội dung `DA_DUYET` dùng để trả lời |
| C07 | `goiYTraLoi` | `SanPhamGoiY` | `0..*`: liên kết sản phẩm gợi ý của trả lời |
| C08 | `nguonTraLoi` | `NguonTraLoi` | `0..*`: các nguồn/bản chụp được sử dụng |

Đầu gần Controller của cả tám association ghi `0..*`: một Entity có thể chưa được ngữ cảnh xử lý nào tham chiếu, hoặc được nhiều ngữ cảnh tham chiếu, ví dụ cùng một sản phẩm được nhiều cuộc tư vấn đọc. Vì vậy sơ đồ không áp đặt mỗi sản phẩm hoặc tài khoản chỉ thuộc một Controller.

Ví dụ `ChatbotController 0..* → 1 PhienChat`: mỗi ngữ cảnh Controller ở trạng thái đang tư vấn có đúng một phiên; một phiên lưu trong hệ thống có thể được nhiều lượt tư vấn/ngữ cảnh xử lý tham chiếu qua thời gian hoặc đồng thời khi hệ thống cho phép. Khi kết thúc lượt, liên kết bộ nhớ có thể được giải phóng, còn dữ liệu phiên vẫn được lưu.

Nếu cần vẽ cả giai đoạn đối tượng chưa mở phiên, dùng `phienChat [0..1]` và ràng buộc `{đã mở phiên ⇒ phienChat khác NULL}`. Bản này chọn góc nhìn **sau khi đã mở phiên**, nên dùng `[1]` nhất quán với giả định.

## Vì sao có thể đổi từ dependency sang association?

Dependency phù hợp khi lớp chỉ sử dụng một kiểu/đối tượng để thực hiện lời gọi. Association phù hợp với lựa chọn giữ các đối tượng Entity thành thuộc tính hoặc tập tham chiếu của ngữ cảnh điều khiển. Bản mới thể hiện đầy đủ lựa chọn đó bằng thuộc tính, đường liên kết có hướng và multiplicity.

Mũi tên chỉ khả năng điều hướng từ Controller đến Entity. Màu xanh dương phân biệt các association Cxx của ngữ cảnh với association dữ liệu xanh lá Rxx. Form–Controller và Controller–phân hệ AI vẫn là lời gọi dịch vụ (dependency nét đứt tím).

## Ánh xạ khi viết NestJS

Controller HTTP NestJS mặc định dùng chung giữa nhiều yêu cầu. Khi triển khai, dùng một đối tượng ngữ cảnh tư vấn riêng theo yêu cầu/phiên, do service tạo và truyền vào các thao tác xử lý. Các thuộc tính Entity của mô hình này sẽ nằm trong đối tượng ngữ cảnh đó; HTTP Controller nhận yêu cầu và giao cho service.

File này chỉ thay đổi **mô hình phân tích**. Chưa thay đổi scope của NestJS, mã nguồn ứng dụng, schema hoặc dữ liệu trong database. Các thuộc tính/phương thức của tám Entity và 10 association dữ liệu tiếp tục theo ERD đã gộp.
