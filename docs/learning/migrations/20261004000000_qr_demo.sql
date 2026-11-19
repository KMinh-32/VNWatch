-- BẢN HỌC TẬP, KHÔNG DÙNG CHẠY MIGRATION
-- Nguồn gốc: outputs/vnwatch-backend/prisma/migrations/20261004000000_qr_demo/migration.sql
-- Migration gốc được giữ nguyên checksum.
-- Thay đổi cấu trúc/ràng buộc bảng trong phiên bản migration này, không phải câu lệnh chạy mỗi request.
ALTER TABLE orders DROP CONSTRAINT order_cod_only;
-- Thay đổi cấu trúc/ràng buộc bảng trong phiên bản migration này, không phải câu lệnh chạy mỗi request.
ALTER TABLE orders ADD CONSTRAINT order_payment_method_valid CHECK (payment_method IN ('COD','QR_DEMO'));
-- Thay đổi cấu trúc/ràng buộc bảng trong phiên bản migration này, không phải câu lệnh chạy mỗi request.
ALTER TABLE orders DROP CONSTRAINT order_state_valid;
-- Thay đổi cấu trúc/ràng buộc bảng trong phiên bản migration này, không phải câu lệnh chạy mỗi request.
ALTER TABLE orders ADD CONSTRAINT order_state_valid CHECK (
  (status='PENDING' AND shipping_status='NOT_SHIPPED' AND (payment_status='UNPAID' OR payment_method='QR_DEMO')) OR
  (status='CONFIRMED' AND ((payment_method='COD' AND payment_status='UNPAID' AND shipping_status IN ('NOT_SHIPPED','IN_TRANSIT')) OR (payment_method='QR_DEMO' AND ((payment_status='UNPAID' AND shipping_status='NOT_SHIPPED') OR (payment_status='PAID' AND shipping_status IN ('NOT_SHIPPED','IN_TRANSIT')))))) OR
  (status='COMPLETED' AND payment_status='PAID' AND shipping_status='DELIVERED') OR
  (status='CANCELLED' AND payment_status='UNPAID' AND shipping_status='NOT_SHIPPED')
);
