# Phạm vi và trạng thái

## Hiện hành 09/10/2026 — quản trị ADMIN và Docker

Bản Docker tại http://127.0.0.1:5180 có trang /admin và đăng nhập quản trị riêng; mọi API quản trị chỉ cho ADMIN. Có tạo/sửa/ngừng sản phẩm, tạo/sửa thông tin giao hàng/xử lý/lưu trữ/khôi phục đơn, quản lý tài khoản/quyền/khóa/phiên, khuyến mãi, hỗ trợ, đánh giá, báo cáo CSV và nhật ký. CUSTOMER/STAFF vẫn mua bằng tài khoản của mình, không được quản trị. Tạo admin đầu tiên qua CREATE-ADMIN.cmd bằng email mới/mật khẩu tự chọn. Hướng dẫn hiện hành: [ADMIN.vi.md](../../../ADMIN.vi.md). Dữ liệu cũ giữ nguyên; những mục bên dưới là lịch sử các lần giao.

## Cập nhật 04/10/2026 — QR demo

Checkout đã có **Mã QR demo trên website**: tạo đơn, xem mã/số tiền ngay trong chi tiết và bấm **Mô phỏng thanh toán thành công**. QR không chứa tài khoản ngân hàng, không chuyển tiền thật; quét không tự xác nhận. Chỉ chủ đơn xác nhận demo; QR chưa PAID không được giao, đã PAID không hủy/hoàn tiền trong bản này. COD vẫn là mặc định. Chi tiết: [QR-DEMO.vi.md](QR-DEMO.vi.md). Những giới hạn về thanh toán online bên dưới chỉ nói đến tích hợp thật.

## Hiện hành 03/10/2026 — hoàn thiện website

Đã có giỏ riêng trên server, yêu thích, so sánh, địa chỉ, mã giảm giá, đánh giá sau mua, hỗ trợ/bảo hành demo, quản trị sản phẩm/SKU/giá/tồn, báo cáo CSV và audit. React bắt đăng nhập trước khi thêm giỏ; mọi tài khoản ACTIVE được mua. Thay đổi quản trị kiểm tra quyền và phiên trong giao dịch; tồn dùng phiên bản trước để tránh ghi đè đơn vừa đặt.

Chi tiết chức năng, quyền và phần còn thiếu: [COMPLETENESS.vi.md](COMPLETENESS.vi.md). Online payment/email/SMS/giao hàng thực tế, serial, OpenAI thật và public deployment chưa được cấu hình. Các phần bên dưới là **lịch sử**, gồm những mô tả giỏ local hoặc module chưa làm đã được thay thế.

## Cập nhật 03/10/2026 — yêu cầu đăng nhập trước khi thêm giỏ

Theo yêu cầu mới nhất, khách chưa đăng nhập chỉ xem catalog và dùng trợ lý. React mở form đăng nhập khi bấm thêm sản phẩm hoặc mở giỏ; mỗi lần thêm kiểm tra phiên qua `/users/me` và không thay đổi giỏ nếu phiên bị thu hồi/hết hạn hoặc API lỗi. Sau đăng nhập quay lại sản phẩm/phiên bản đã chọn hoặc mở giỏ theo yêu cầu. Đóng form không mở giỏ hay checkout. Quote/create đơn tiếp tục được SessionGuard kiểm tra trên server; mọi tài khoản ACTIVE, gồm CUSTOMER/STAFF/ADMIN, được mua. Giỏ vẫn lưu cục bộ trên trình duyệt, chưa có API đồng bộ giỏ. Hướng dẫn của trợ lý đã đổi sang đăng nhập trước.

## Cập nhật tồn kho 03/10/2026

Theo yêu cầu người dùng, 15 phiên bản hiện có được đặt tồn 100; 13 phiên bản ACTIVE thuộc 12 sản phẩm hiển thị có thể thêm giỏ và đặt COD giả lập. Trạng thái ẩn/ngừng kinh doanh, giá, tài khoản và đơn cũ giữ nguyên. Seed development tạo phiên bản mới với tồn 100, không ghi đè tồn đã thay đổi khi chạy lại. Lệnh restock riêng có bản ghi trước/sau và giới hạn database local dev.

Mọi tài khoản đang hoạt động (CUSTOMER, STAFF, ADMIN) có thể đặt đơn sau đăng nhập. Backend **59/59 test đạt** trong lượt tồn kho, bao gồm đặt sản phẩm thật bằng cả 3 vai trò, trừ tồn 100 → 99 và hủy hoàn 100. Frontend **11/11 E2E đạt** trong lượt đó, COD dùng Casio thật, retry giữ một đơn và hủy hoàn tồn. Quy tắc khách thêm giỏ trong lượt đó đã được thay thế bằng yêu cầu đăng nhập ở cập nhật trên. Các cập nhật dưới đây là lịch sử của những lần giao trước.

## Cập nhật 03/10/2026 — trạng thái hiện hành

Đã bổ sung trợ lý tư vấn khách hàng: React chat, NestJS gateway công khai giới hạn tần suất, FastAPI tra cứu dữ liệu hiện tại và 5 thương hiệu có nguồn chính thức. Chuẩn bị OpenAI Responses/function calling; khi chưa có key hoặc provider lỗi, dùng chế độ catalog được ghi rõ. Model chỉ tạo truy vấn đọc; giá/tồn/thông số/câu trả lời/nguồn được dựng từ dữ liệu. Không truy cập thông tin đơn hàng riêng tư hoặc tự đặt/hủy/thanh toán.

Hiện đã kiểm thử **58 backend + 24 Python agent + 11 frontend E2E**. Backend dùng PostgreSQL test schema riêng; Python có fake provider và HTTP transport giả cho SDK thật; E2E chat qua dịch vụ FastAPI thật ở chế độ catalog. Chưa gọi OpenAI thật vì chưa có key, chưa đánh giá chất lượng mô hình trên bộ câu hỏi thực tế. Xem [README agent](../../vnwatch-agent/README.vi.md).

Phạm vi catalog/auth/users/COD/sản phẩm thật đã triển khai trong cập nhật 02/10 vẫn giữ. Chưa có online payment, bảo hành/đổi trả thực tế, product/inventory admin, đồng bộ nhà cung cấp, hạn mức AI theo ngày hoặc public deployment. Các mục cũ bên dưới là lịch sử, không thay thế cập nhật này.

## Cập nhật 02/10/2026 — trạng thái hiện hành

Đã triển khai thêm COD Orders: quote theo giá/tồn database, phí giao hàng demo 30.000 VND, snapshot sản phẩm/giá/địa chỉ/bảo hành, giao dịch giữ khóa, idempotency theo user/key, owner xem/hủy đơn chờ, staff/admin xác nhận/giao/hoàn tất/hủy. Hủy trả tồn đúng một lần. Frontend React có giỏ, checkout, retry sau mất phản hồi, lịch sử đơn và xử lý đơn theo quyền.

Đã nhập 10 mẫu thật thuộc Casio, Seiko, Citizen, Orient, Tissot; ảnh/thông số/giá có nguồn và ngày kiểm tra. Dữ liệu DEMO giữ riêng. Mẫu thật khởi tạo tồn 0 và bảo hành chưa cấu hình nên chưa mở bán. Xem `PRODUCT-SOURCES.vi.md`.

Backend vượt qua 53 kiểm tra trên PostgreSQL thật. Test cạnh tranh 100 yêu cầu tranh 10 sản phẩm có 10 thành công, 90 xung đột, tồn còn 0; đây là kiểm tra tính đúng đắn, không phải benchmark. Chưa đo p50/p95 hoặc mục tiêu 100 sản phẩm/20 người dùng.

Bước tiếp theo: quản trị sản phẩm/tồn/giá với phân quyền và audit. Chưa có online payment/VNPAY/refund, voucher, phát hành bảo hành/serial, báo cáo, AI, đồng bộ nhà cung cấp hoặc public deployment. Các phần bên dưới ghi lại trạng thái của lần giao 01–02 và không thay thế cập nhật này.

## Thông tin đã nhận

- Người học chọn TypeScript và NestJS.
- Chưa có repository hoặc báo cáo gốc.
- Nguồn nghiệp vụ hiện tại là bản yêu cầu VNWatch do người dùng gửi.
- Chưa biết mục tiêu Intern/Junior, kinh nghiệm hiện tại hoặc số giờ mỗi tuần; lộ trình 12 tuần vẫn là dự kiến.

## Hoàn thành trong mã nguồn phần 01–02

Catalog công khai: list/detail, SKU, thông số, lọc, phân trang, trạng thái hiển thị; migration, seed demo, Swagger, lỗi tiếng Việt, log/request ID, health; môi trường DB, CI cấu hình và test. Kết quả thực thi, không chỉ sự tồn tại của file, ghi riêng tại `VERIFICATION.vi.md`.

Auth/Users: đăng ký chỉ tạo CUSTOMER, băm mật khẩu bằng scrypt, login với token opaque, phiên lưu digest, logout/revoke, đổi mật khẩu, reset token một lần 15 phút, khóa sau 5 lần sai trong 15 phút, rate limit lưu PostgreSQL, owner/admin authorization, thu hồi phiên khi khóa/đổi quyền, bảo vệ last active admin và audit event.

## Chưa triển khai

Quản lý/sửa catalog; Inventory write/audit; Cart; Orders/COD; snapshot đơn, chống overselling và idempotency; Payments/VNPAY và refund; Promotions; Warranty; Reports; Audit nghiệp vụ ngoài User access; AI Assistant; upload/tìm ảnh; benchmark; triển khai public; backup/restore; sơ đồ checkout/payment từ mã thực tế.

Không có module rỗng hoặc TODO nghiệp vụ được coi là chức năng hoàn thành. CI có file cấu hình nhưng chưa có lần chạy GitHub được xác nhận.

## Phần tiếp theo dự kiến

Quản lý sản phẩm/tồn theo quyền; giỏ hàng và COD. Checkout và callback chỉ được đánh dấu hoàn thành sau test cạnh tranh trên PostgreSQL.

Các chính sách còn cần quyết định: nhân viên có những quyền nào; thời hạn khóa đăng nhập, giữ tồn đơn online, thời gian idempotency; phí giao hàng/voucher; bảo hành/đổi trả; tài khoản VNPAY; chatbot dùng nguồn chính sách nào.

## Mục tiêu chưa đo

100 sản phẩm, 20 người dùng đồng thời, tìm kiếm dưới 3 giây, đặt hàng dưới 5 giây. Hiện chưa có benchmark hoặc API đặt hàng. Không dùng thời gian chạy test làm latency hay throughput của hệ thống.
