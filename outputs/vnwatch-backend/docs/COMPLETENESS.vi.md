# Chức năng VNWatch — 03/10/2026

## Cập nhật 04/10/2026 — QR demo

Checkout đã có **Mã QR demo trên website**: tạo đơn, xem mã/số tiền ngay trong chi tiết và bấm **Mô phỏng thanh toán thành công**. QR không chứa tài khoản ngân hàng, không chuyển tiền thật; quét không tự xác nhận. Chỉ chủ đơn xác nhận demo; QR chưa PAID không được giao, đã PAID không hủy/hoàn tiền trong bản này. COD vẫn là mặc định. Chi tiết: [QR-DEMO.vi.md](QR-DEMO.vi.md). Những giới hạn về thanh toán online bên dưới chỉ nói đến tích hợp thật.

React/TypeScript, NestJS/PostgreSQL và trợ lý FastAPI chạy local tại http://127.0.0.1:5173. Đây là demo nghiệp vụ, chưa thu tiền hoặc giao hàng thật.

## Chức năng dùng được

| Nhóm               | Chức năng                                                                                                          | Quyền                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Catalog            | 10 mẫu thật/5 hãng, nguồn giá/thông tin, chi tiết SKU, tìm kiếm, lọc giá/hãng/bộ máy/còn hàng, sắp giá, phân trang | Công khai                                  |
| Chọn sản phẩm      | So sánh tối đa 3 mẫu, yêu thích lưu trên server                                                                    | So sánh công khai; yêu thích cần đăng nhập |
| Tài khoản          | Đăng ký, đăng nhập/đăng xuất, hồ sơ, mật khẩu/reset qua outbox local, quản lý/thu hồi phiên                        | Chủ tài khoản                              |
| Giỏ                | Thêm/sửa/xóa, lưu riêng trên database, kiểm tra phiên và tồn khi ghi                                               | Mọi tài khoản ACTIVE                       |
| Nhận hàng          | Sổ địa chỉ tối đa 10, chọn địa chỉ khi checkout                                                                    | Chủ tài khoản                              |
| Đơn COD            | Báo giá, snapshot, chống tạo trùng khi retry, kiểm tra tồn trong giao dịch, lịch sử/hủy đơn chờ                    | Chủ đơn                                    |
| Xử lý đơn          | Xác nhận, giao, hoàn tất/thu COD hoặc hủy theo trạng thái                                                          | ADMIN                                |
| Khuyến mãi         | Mã giảm tiền VND, tối thiểu đơn, thời hạn, giới hạn tổng/theo người, bật/tắt có lý do                              | ADMIN cấu hình; mọi người mua áp dụng      |
| Hỗ trợ             | Yêu cầu chung/đơn/bảo hành, hội thoại riêng, phản hồi và trạng thái                                                | Chủ yêu cầu; ADMIN xử lý             |
| Đánh giá           | Viết/cập nhật sau đơn COMPLETED/PAID/DELIVERED; công khai, ẩn có lý do                                             | Người đã mua; ADMIN kiểm duyệt             |
| Bảo hành demo      | Phiếu theo snapshot đơn hoàn tất, ngày kích hoạt/hết hạn, yêu cầu kiểm tra trong hạn                               | Chủ đơn                                    |
| Quản trị catalog   | Tạo mẫu DEMO/SKU, sửa nội dung/ảnh HTTPS/thông số/giá/tồn/trạng thái                                               | ADMIN                       |
| Quản trị tài khoản | Danh sách, quyền/trạng thái, thu hồi phiên khi đổi quyền/khóa                                                      | ADMIN                                      |
| Báo cáo            | Doanh thu demo đã hoàn tất và thanh toán, đơn theo trạng thái, bán chạy, tồn thấp, hỗ trợ mở, CSV                  | ADMIN                                      |
| Nhật ký            | Actor, hành động, lý do, JSON trước/sau, phân trang                                                                | ADMIN                                      |
| Tư vấn             | Catalog hiện tại, thông tin 5 thương hiệu có nguồn, chính sách, mở sản phẩm/hỗ trợ                                 | Công khai                                  |
| Thông tin          | FAQ, mua hàng/COD, bảo hành demo, quyền riêng tư, giới hạn dịch vụ                                                 | Công khai                                  |

## Quy tắc khi thử

- Đăng nhập trước khi thêm giỏ. Giỏ server không giữ chỗ; tạo đơn trừ tồn, hủy đơn chờ trả tồn đúng một lần. Giỏ local cũ không tự gán cho tài khoản vì không xác định được chủ sở hữu.
- Token chỉ giữ trong bộ nhớ; tải lại cần đăng nhập, rồi giỏ/yêu thích/địa chỉ đã lưu được tải lại. Không lưu token/API key trong localStorage.
- SKU hiện hữu khởi tạo tồn 100 theo yêu cầu. Sửa metadata/tồn dùng phiên bản và tồn trước đó; API từ chối bản sửa cũ nếu đơn khác vừa trừ tồn. Thay đổi quản trị có lý do và audit.
- Coupon kiểm tra và ghi lượt trong giao dịch tạo đơn. Hai người tranh lượt cuối chỉ một được dùng; retry không dùng thêm lượt, hủy đơn không hoàn lượt trong chính sách demo.
- Báo cáo tổng hợp toàn bộ thời gian, chỉ tính doanh thu đơn hoàn tất đã thu COD, sau giảm giá và gồm phí giao hàng. Không cộng doanh thu đơn chờ/đang giao.
- Bảo hành dùng số tháng tại lúc đặt và ngày hoàn tất đơn, theo dòng đơn/số lượng; chưa có serial mỗi chiếc. Mẫu chưa cấu hình thời hạn không tự có phiếu. Không tạo serial/đánh giá giả.
- ADMIN tạo mẫu mới có nhãn DEMO. Mẫu thật giữ nguồn tham khảo; sửa giá chuyển nguồn giá sang cấu hình demo. Ảnh URL ngoài có thông báo lỗi thay thế; chưa có upload file.
- Chat chỉ đọc catalog/chính sách, không đọc địa chỉ/đơn riêng, tự đặt đơn hay gửi yêu cầu. Chưa có OpenAI key nên chạy tư vấn theo dữ liệu và ghi nhãn trên UI.

## Chạy và quản trị

Tại `outputs`, chạy `./start-vnwatch.ps1`, mở http://127.0.0.1:5173. Các màn hình: [HUONG-DAN.vi.md](../../vnwatch-frontend/HUONG-DAN.vi.md).

Đăng ký luôn tạo CUSTOMER. Tạo ADMIN local bằng `npm run db:bootstrap-admin` với email/mật khẩu tự chọn theo [RUNBOOK.vi.md](RUNBOOK.vi.md). Không có mật khẩu mặc định. Sau đăng nhập ADMIN dùng **Quản trị cửa hàng**; quản trị tài khoản nằm trong màn hình tài khoản. STAFF chỉ mua hàng như CUSTOMER. Bản Docker có trang /admin, tạo tài khoản đầu bằng CREATE-ADMIN.cmd; xem [ADMIN.vi.md](../../../ADMIN.vi.md). Bootstrap chỉ chạy trên database dev loopback chưa có ADMIN.

## Còn cần để bán hàng thật

| Việc còn thiếu                 | Cần bổ sung                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Thanh toán online/VNPAY/refund | Tài khoản sandbox/provider, callback xác thực chữ ký/idempotency, đối soát và hoàn tiền; hiện chỉ COD demo                    |
| Thông báo                      | Provider email/SMS, queue/retry; reset dùng outbox local, hỗ trợ chỉ trong website                                            |
| Hàng hóa/hậu mãi               | Nguồn giá/tồn live, serial, điều khoản bảo hành/đổi trả xác nhận, phí/vùng giao và nhà vận chuyển                             |
| OpenAI thật                    | Key/quota server, kiểm tra câu hỏi thực tế, ngân sách/giám sát; fake provider test không xác nhận kết nối thật                |
| Production                     | Tên miền/HTTPS, proxy/CORS/session cookie được rà soát, secrets, backup/restore diễn tập, monitoring, CI chạy thật, benchmark |
| Mở rộng tùy nhu cầu            | Tìm bằng ảnh, upload ảnh, lọc kỳ báo cáo, phân trang bảo hành, accessibility đầy đủ                                           |

Các mục này chưa được gọi là hoàn thành. Kiểm chứng: [backend](VERIFICATION.vi.md), [frontend](../../vnwatch-frontend/VERIFICATION.vi.md). Quản trị UI được kiểm tra với API thật trên schema PostgreSQL test riêng, không tạo ADMIN/sửa quyền trong database dev. Kiểm tra ảnh chấp nhận ảnh thật tải được **hoặc thông báo lỗi rõ ràng**, không xác nhận mọi nguồn ngoài luôn truy cập được.
