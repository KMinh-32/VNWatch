-- BẢN HỌC TẬP, KHÔNG DÙNG CHẠY MIGRATION
-- Nguồn gốc: outputs/vnwatch-backend/prisma/migrations/20261009000000_admin_order_archive/migration.sql
-- Migration gốc được giữ nguyên checksum.
-- Thay đổi cấu trúc/ràng buộc bảng trong phiên bản migration này, không phải câu lệnh chạy mỗi request.
ALTER TABLE orders ADD COLUMN archived_at TIMESTAMPTZ(3);
-- Thay đổi cấu trúc/ràng buộc bảng trong phiên bản migration này, không phải câu lệnh chạy mỗi request.
ALTER TABLE orders ADD CONSTRAINT orders_archive_terminal CHECK (archived_at IS NULL OR status IN ('COMPLETED', 'CANCELLED'));
-- Tạo index/unique index cho truy vấn hoặc chặn bản ghi trùng; xem tên cột để hiểu phạm vi.
CREATE INDEX orders_archive_status_created_idx ON orders(archived_at, status, created_at, id);
