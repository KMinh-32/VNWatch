# ERD mở rộng cho chatbot AI của VNWatch

Bản thiết kế này mở rộng ERD trong ảnh người dùng gửi. ERD gốc **đã có `tinnhanchat`** với `MaPhien`, nhưng chưa có bảng được tham chiếu bởi `MaPhien`. Bổ sung bốn bảng và hoàn thiện bảng tin nhắn; các bảng bán hàng khác tiếp tục theo ERD gốc.

- `ERD-chatbot.png`: ảnh sơ đồ để chèn vào báo cáo.
- `ERD-chatbot.svg`: bản vector để phóng to hoặc xuất PDF.
- `ERD-chatbot.drawio`: sơ đồ chỉnh sửa được bằng diagrams.net/draw.io.
- `ERD-chatbot.mmd`: mã nguồn Mermaid.

Sơ đồ chỉ hiển thị các cột liên quan ở hai bảng `taikhoan`, `sanpham`; không có ý nghĩa xóa các cột còn lại trong ERD gốc. Màu xanh dương: bảng có sẵn; màu cam: bảng cần điều chỉnh; màu xanh lá: bảng bổ sung.

## Các bảng bổ sung

| Bảng | Vai trò | Khóa và ràng buộc chính |
| --- | --- | --- |
| `phienchat` | Gom các tin nhắn của một cuộc hội thoại; phân biệt nhiều cuộc chat của cùng khách. | PK `MaPhien VARCHAR(36)` chứa UUID; FK `MaTK` cho phép NULL với khách chưa đăng nhập. |
| `sanphamgoiy` | Lưu các sản phẩm được gợi ý trong từng câu trả lời, cùng thứ tự và lý do. | PK ghép (`MaTN`, `MaSP`); hai cột đều là FK. UNIQUE (`MaTN`, `ThuTu`); `ThuTu > 0`. |
| `kienthucchatbot` | Lưu nội dung thương hiệu, chính sách mua hàng và hướng dẫn mà admin đã duyệt. | PK `MaKT`; FK `NguoiDuyet` → `taikhoan.MaTK`. Chỉ dùng bản ghi `DA_DUYET` để trả lời. |
| `nguontraloi` | Lưu nguồn đã dùng cho một câu trả lời và bản chụp phần nội dung được trích dẫn. | PK `MaNguon`; FK bắt buộc `MaTN`; FK `MaKT` cho phép NULL với nguồn trang sản phẩm. |

Một tin nhắn có thể đề xuất nhiều sản phẩm; cùng một sản phẩm có thể được đề xuất trong nhiều tin nhắn. Vì vậy cần bảng nối `sanphamgoiy`, không đặt một cột `MaSP` đơn trong `tinnhanchat`.

`kienthucchatbot.ChuDe` là nhãn tìm kiếm, ví dụ “Seiko”, “Đổi trả” hoặc “Chọn kích thước”, không phải FK tới `sanpham.ThuongHieu`. Bảng thương hiệu riêng là một cải tiến chuẩn hóa catalog có thể làm sau; không bắt buộc để lưu hội thoại.

## Điều chỉnh bảng `tinnhanchat` hiện có

1. Đặt `MaPhien` là FK bắt buộc tới `phienchat.MaPhien`.
2. Giữ `MaTK` là FK người gửi, cho phép NULL khi người gửi là AI/hệ thống/khách vãng lai. Chủ phiên nằm ở `phienchat.MaTK`. Backend xác định tài khoản từ phiên đăng nhập, không tin `MaTK` do trình duyệt tự gửi lên.
3. Giữ `NguoiGui`, `NoiDung`, `YDinh`, `ThoiGian`; thống nhất `NguoiGui` thành `KHACH`, `TRO_LY`, `HE_THONG`.
4. Thêm `CheDo VARCHAR(20) NULL` để phân biệt `OPENAI` và `DU_PHONG` cho tin của trợ lý. Đây là chế độ xử lý, không phải loại người gửi.
5. Thêm `TenMoHinh VARCHAR(100) NULL` để biết mô hình nào tham gia xử lý, nếu có.
6. Thêm `TrangThai VARCHAR(20)` với `DANG_XU_LY`, `HOAN_TAT`, `LOI`. Tin của khách có thể được ghi ngay ở trạng thái `HOAN_TAT`.

## Kiểu dữ liệu đề nghị

| Bảng | Đặc tả các trường ngoài khóa |
| --- | --- |
| `phienchat` | `TieuDe VARCHAR(150) NULL`, `TrangThai VARCHAR(20)`, `NgayTao DATETIME`, `NgayCapNhat DATETIME`. |
| `sanphamgoiy` | `ThuTu INT`, `LyDo VARCHAR(255) NULL`; `MaSP VARCHAR(20)` phải cùng kiểu/độ dài với PK gốc. |
| `kienthucchatbot` | `Loai VARCHAR(30)`, `ChuDe VARCHAR(100)`, `TieuDe VARCHAR(200)`, `NoiDung TEXT`, `URLNguon VARCHAR(1000) NULL`, `TrangThai VARCHAR(20)`, `NguoiDuyet INT NULL`, `NgayDuyet DATETIME NULL`, `NgayCapNhat DATETIME`. |
| `nguontraloi` | `TieuDeNguon VARCHAR(200)`, `URLNguon VARCHAR(1000) NULL`, `NoiDungTrichDan TEXT NULL`, `ThoiDiemSuDung DATETIME`. |

Giữ cách ghi `DATETIME` và UUID dưới dạng `VARCHAR(36)` để đồng bộ với ERD trong ảnh. Khi triển khai vào PostgreSQL/Prisma hiện tại, dùng `uuid` cho mã phiên và `timestamptz` cho thời gian; tất cả PK/FK tương ứng phải cùng kiểu. Khóa INT mới dùng identity/autoincrement theo hệ quản trị.

## Quan hệ và quy tắc nghiệp vụ

- Một tài khoản có 0..N phiên chat. Một phiên thuộc 0..1 tài khoản, nên vẫn hỗ trợ tư vấn trước khi đăng nhập.
- Một phiên có 0..N tin nhắn. Mỗi tin nhắn bắt buộc thuộc đúng một phiên.
- Một tin nhắn có 0..N sản phẩm gợi ý và 0..N nguồn trả lời. Chỉ gắn các bản ghi này vào tin của trợ lý; backend kiểm tra quy tắc đó.
- Một nguồn trả lời có thể tham chiếu 0..1 bản ghi kiến thức; khi nguồn là một trang sản phẩm, lưu URL/tiêu đề/bản chụp nội dung và để `MaKT` NULL.
- Một bản ghi kiến thức có 0..1 người duyệt; trạng thái `DA_DUYET` yêu cầu `NguoiDuyet` và `NgayDuyet` khác NULL. Người duyệt phải có quyền admin, được kiểm tra ở backend.
- Với khách đã đăng nhập, `tinnhanchat.MaTK` của tin khách phải khớp chủ phiên. Với tin AI/hệ thống, trường này NULL. Chưa đưa chức năng nhân viên tiếp quản chat vào mô hình này.
- Tạo index `phienchat(MaTK, NgayCapNhat)`, `tinnhanchat(MaPhien, ThoiGian, MaTN)`, `sanphamgoiy(MaSP)` và `nguontraloi(MaKT)`; index kiến thức theo `TrangThai`, `Loai`, `ChuDe` khi cần tìm kiếm.
- Xóa một phiên có thể cascade tin nhắn, nguồn trả lời và liên kết sản phẩm gợi ý. Không cascade từ sản phẩm/kiến thức sang lịch sử: ưu tiên ngừng hiển thị sản phẩm hoặc lưu trữ kiến thức bằng trạng thái; nếu buộc xóa kiến thức, `nguontraloi.MaKT` có thể `SET NULL` và vẫn giữ bản chụp nguồn.
- Kiểm tra quyền đọc từng phiên tại backend; mã UUID của phiên không tự cấp quyền xem lịch sử.
- Sản phẩm gợi ý chỉ lưu sản phẩm/thứ tự/lý do. Khi khách thêm vào giỏ hoặc đặt hàng, đọc lại giá và tồn kho hiện tại, đồng thời áp dụng yêu cầu đăng nhập của website.

Ví dụ: khách hỏi “Gợi ý đồng hồ Seiko dưới 5 triệu” → một tin `KHACH`; trợ lý trả lời → một tin `TRO_LY`, vài dòng `sanphamgoiy`, và những dòng `nguontraloi` tương ứng. Nếu chưa có API key, câu trả lời vẫn được lưu với `CheDo = DU_PHONG`.

## Đối chiếu với mã nguồn hiện tại

`D:\VNWatch\outputs\vnwatch-backend\prisma\schema.prisma` hiện có các model `User`, `Product` và nghiệp vụ mua hàng, nhưng chưa có model lưu phiên/tin nhắn của trợ lý. `assistant.service.ts` chuyển lịch sử do frontend gửi tới FastAPI; kiến thức thương hiệu/chính sách hiện nằm trong `src/assistant/knowledge.ts`.

Do đó đây là **bản ERD đề xuất** theo tên bảng trong ảnh, chưa phải migration đã áp dụng vào database. Khi triển khai cần ánh xạ FK tới model `User`/`Product` thực tế và chuyển dữ liệu kiến thức đã duyệt từ cấu hình hiện có; không tạo thêm một hệ bảng tài khoản/sản phẩm trùng lặp.
