# Thanh toán QR demo — 04/10/2026

## Thử trên website

1. Đăng nhập, chọn sản phẩm còn hàng, thêm giỏ và mở đặt hàng.
2. Chọn **Mã QR demo trên website**; nhập địa chỉ/mã giảm giá nếu có và kiểm tra tổng tiền.
3. Bấm **Tạo đơn và xem mã QR demo**. Website mở đơn vừa tạo và hiển thị QR ngay trong chi tiết, cùng số tiền/mã đơn và nhãn DEMO.
4. QR chỉ mã hóa văn bản ASCII gồm VNWatch DEMO, NOT A BANK TRANSFER, mã UUID đơn, tổng VND và tiền tệ. Camera quét chỉ đọc văn bản; mã không chứa ngân hàng/tài khoản, không gửi tiền và không gọi callback thanh toán.
5. Bấm **Mô phỏng thanh toán thành công** để thử trạng thái PAID. Nếu mất phản hồi, bấm lại hoặc cập nhật trạng thái; server chỉ ghi một sự kiện thanh toán. Có thể xem lại trong Đơn hàng của tôi.

Không dùng app ngân hàng hoặc chuyển tiền thật với mã này. Không có ngân hàng/cổng thanh toán được cấu hình.

## Quy tắc

- COD vẫn là mặc định; khách cũ/bản nháp COD/idempotency key cũ giữ tương thích. Chọn phương thức khác với cùng key/nội dung đã gửi gây 409.
- Phải đăng nhập. Chỉ chủ đơn lấy QR và xác nhận demo, kể cả STAFF/ADMIN không được xác nhận thay qua endpoint owner. Xác nhận cần acknowledgement DEMO_NO_MONEY; không nhận số tiền hay trạng thái từ client.
- QR lấy số tiền đã chốt của đơn sau giảm giá/phí giao, không lấy từ giỏ có thể thay đổi. Ma trận tạo tại server bằng thư viện local, SVG có quiet zone 4 module; không gửi đơn hay QR sang dịch vụ ngoài.
- Tạo đơn trừ tồn và lượng giỏ đúng một lần, dùng cơ chế quote/transaction/coupon/idempotency cũ. Mô phỏng thanh toán không trừ tồn/tiêu mã thêm.
- ADMIN có thể xác nhận tiếp nhận đơn chưa thanh toán, nhưng chỉ giao QR sau PAID. Hoàn tất đơn QR đã thanh toán chỉ xác nhận giao hàng; COD hoàn tất xác nhận cả giao và thu COD.
- Hủy QR chưa thanh toán và còn PENDING được hoàn tồn đúng một lần. Đơn đã PAID không hủy/hoàn tiền trong bản này. Thanh toán tranh với hủy được khóa/giao dịch hóa: chỉ một kết quả hợp lệ, không có đơn hủy đã trả tồn nhưng lại PAID.
- Audit PAY_QR_DEMO lưu actor, trước/sau, lý do ghi rõ không có tiền thật. Migration mở phương thức QR_DEMO, giữ ràng buộc COD cũ và chặn giao QR chưa PAID.
- Bảo hành vẫn chỉ kích hoạt sau COMPLETED/PAID/DELIVERED, không ngay lúc PAID. Báo cáo chỉ cộng doanh thu demo đã hoàn tất, gồm cả COD và QR; không coi PAID demo là giao dịch ngân hàng.

## API

- POST /api/v1/orders/quote, POST /api/v1/orders: paymentMethod COD hoặc QR_DEMO, mặc định COD.
- GET /api/v1/orders/:id/qr-demo: owner, orderId/totalVnd/currency/mode/payload/modules. Đơn COD hoặc đã hủy trả 409.
- POST /api/v1/orders/:id/qr-demo/confirm: owner, body acknowledgement DEMO_NO_MONEY, trả snapshot đơn; lặp lại không ghi thêm sự kiện.

Mã QR dùng qrcode-terminal 0.12.0 được vendor từ bản npm có sẵn trên máy, cài offline bằng file dependency. Nguồn và giấy phép giữ tại vendor/qrcode-terminal/VNWATCH-NOTICE.md và LICENSE; bộ mã hóa QR của Kazuhiko Arase giữ thông báo MIT. Không đổi thuật toán bên thứ ba.

## Kiểm chứng và giới hạn

Backend 72/72 test đạt trên PostgreSQL test schema riêng, gồm 5 ca QR: số tiền sau coupon, matrix/finder, owner/validation, 20 xác nhận đồng thời ghi 1 lần, chặn giao chưa PAID, hủy/thanhtoán tranh nhau, idempotency và CHECK database. Build/lint/format đạt. Giao diện có test API thật riêng, lỗi mất phản hồi cố ý, retry và mobile; toàn bộ 15/15 E2E đạt (1,8 phút). Đã xem ảnh mobile 390 × 844 không tràn ngang; không có lỗi runtime trong ca QR.

Chưa kiểm thử camera điện thoại thực tế hoặc tích hợp app ngân hàng; kiểm tra matrix/SVG không được coi là đã thu tiền. Bật QR thật cần dữ liệu nhận tiền đã xác nhận, provider xác thực/đối soát, callback/webhook ký và idempotency, quản lý hết hạn/hoàn tiền. Không dùng nút demo để xác nhận thanh toán thật.
