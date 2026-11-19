# ERD gộp VNWatch: bán hàng và chatbot AI

Ảnh PNG độ phân giải **6540 × 3860**, gồm **17 bảng, 24 quan hệ**. Đây là bản dựng lại thành sơ đồ thống nhất từ ảnh ERD gốc và bản mở rộng chatbot, với đầy đủ trường của các bảng; không phải hai ảnh đặt cạnh nhau.

## File sử dụng

- `VNWatch-ERD-day-du.png`: ảnh độ phân giải cao để đưa vào báo cáo.
- `VNWatch-ERD-day-du.svg`: bản vector phóng to không bị vỡ chữ.
- `VNWatch-ERD-day-du.drawio`: mở bằng diagrams.net/draw.io để sửa bảng và quan hệ.
- `VNWatch-ERD-day-du.mmd`: mã nguồn Mermaid.
- `VNWatch-ERD-day-du.json`: dữ liệu bảng, cột và quan hệ dùng để sinh sơ đồ.

Xanh dương là các bảng gốc; xanh lá là bảng mới; cam là bảng `tinnhanchat` đã cập nhật. `+` đánh dấu cột mới trong bảng này. Các tên bảng `taikhoan`, `sanpham` chỉ xuất hiện một lần và được dùng chung giữa nghiệp vụ bán hàng và chatbot.

## Phạm vi hợp nhất

13 bảng gốc: `danhmuc`, `sanpham`, `hinhanhsanpham`, `danhgiasanpham`, `giohang`, `donhang`, `chitietdonhang`, `baohanh`, `magiamgia`, `thanhtoan`, `lichsudonhang`, `taikhoan`, `tinnhanchat`.

4 bảng bổ sung: `phienchat`, `sanphamgoiy`, `kienthucchatbot`, `nguontraloi`.

`tinnhanchat.MaPhien` trở thành FK tới `phienchat`. Thêm các cột `CheDo`, `TenMoHinh`, `TrangThai`. `MaTK` của phiên/tin nhắn cho phép NULL để khách chưa đăng nhập vẫn được tư vấn. Các quy tắc mua hàng yêu cầu đăng nhập tiếp tục áp dụng ở backend.

## Danh sách quan hệ

| Mã | Bảng cha | Bảng con và khóa ngoại |
| --- | --- | --- |
| R01 | `danhmuc` | `danhmuc.MaDMCha` (cha tùy chọn) |
| R02 | `danhmuc` | `sanpham.MaDM` |
| R03 | `sanpham` | `hinhanhsanpham.MaSP` |
| R04 | `sanpham` | `danhgiasanpham.MaSP` |
| R05 | `sanpham` | `giohang.MaSP` |
| R06 | `sanpham` | `chitietdonhang.MaSP` |
| R07 | `donhang` | `chitietdonhang.MaDH` |
| R08 | `chitietdonhang` | `baohanh.(MaDH, MaSP)` — một FK ghép tham chiếu PK ghép |
| R09 | `magiamgia` | `donhang.MaCode` (mã tùy chọn) |
| R10 | `donhang` | `thanhtoan.MaDH` |
| R11 | `donhang` | `lichsudonhang.MaDH` |
| R12 | `taikhoan` | `donhang.MaTK` — người đặt |
| R13 | `taikhoan` | `donhang.MaNguoiXuLy` — người xử lý tùy chọn |
| R14 | `taikhoan` | `giohang.MaTK` |
| R15 | `taikhoan` | `danhgiasanpham.MaTK` |
| R16 | `taikhoan` | `lichsudonhang.MaTKXuLy` (tùy chọn cho sự kiện hệ thống) |
| R17 | `taikhoan` | `phienchat.MaTK` (khách có thể chưa đăng nhập) |
| R18 | `taikhoan` | `tinnhanchat.MaTK` (NULL với AI/hệ thống/khách vãng lai) |
| R19 | `phienchat` | `tinnhanchat.MaPhien` |
| R20 | `taikhoan` | `kienthucchatbot.NguoiDuyet` (NULL khi chưa duyệt) |
| R21 | `tinnhanchat` | `sanphamgoiy.MaTN` |
| R22 | `sanpham` | `sanphamgoiy.MaSP` |
| R23 | `tinnhanchat` | `nguontraloi.MaTN` |
| R24 | `kienthucchatbot` | `nguontraloi.MaKT` (NULL với nguồn trang sản phẩm) |

Một cha có thể chưa có dòng con nên sơ đồ dùng 0..N ở đầu nhiều. Đơn đã được đặt thành công phải có ít nhất một chi tiết; backend bảo đảm quy tắc đó bằng transaction. Cardinality ERD không tự thực thi quy tắc tối thiểu số dòng con này.

Các ràng buộc bổ sung của chatbot vẫn theo `ERD-chatbot.vi.md`: PK ghép của `sanphamgoiy`, UNIQUE (`MaTN`, `ThuTu`), chỉ dùng kiến thức `DA_DUYET`, lưu bản chụp nguồn và kiểm tra chủ phiên ở backend.

## Các phần phải suy ra do ảnh bị cắt chữ

Ảnh gốc cắt bớt một số độ dài kiểu dữ liệu. Bản gộp hoàn thiện nhất quán: `TenDM VARCHAR(100)`, `ThuongHieu VARCHAR(100)`, `SoDienThoaiNhan VARCHAR(15)`, `ThanhTien DECIMAL(15,0)`, `TongThanhToan DECIMAL(15,0)`, `GiaTriToiThieu DECIMAL(15,0)`, các trường trạng thái `VARCHAR(20)` và các trường thời gian `DATETIME`. Đây là phần đề xuất theo ảnh, cần đối chiếu DDL gốc nếu có để xác nhận từng độ dài chính xác.

Kiểu `DATETIME`, `TINYINT` và `VARCHAR(36)` của mã phiên giữ cách ký hiệu trong ERD. Khi triển khai PostgreSQL/Prisma của VNWatch, ánh xạ tương ứng sang `timestamptz`, `smallint` có CHECK số sao, và `uuid`. PK/FK phải cùng kiểu.

Đây là **tài liệu thiết kế gộp**, chưa tạo bảng hoặc thay đổi dữ liệu trong hệ thống đang chạy. Tên bảng/cột trong ERD tiếng Việt cần được ánh xạ vào các model Prisma thực tế khi triển khai.
