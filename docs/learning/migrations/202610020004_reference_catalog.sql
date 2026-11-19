-- BẢN HỌC TẬP, KHÔNG DÙNG CHẠY MIGRATION
-- Nguồn gốc: outputs/vnwatch-backend/prisma/migrations/202610020004_reference_catalog/migration.sql
-- Migration gốc được giữ nguyên checksum.
-- Thay đổi cấu trúc/ràng buộc bảng trong phiên bản migration này, không phải câu lệnh chạy mỗi request.
ALTER TABLE products
  ADD COLUMN data_kind VARCHAR(16) NOT NULL DEFAULT 'DEMO',
  ADD COLUMN source_name VARCHAR(120),
  ADD COLUMN source_url TEXT,
  ADD COLUMN source_checked_at TIMESTAMPTZ(3),
  ADD COLUMN image_source_url TEXT,
  ADD CONSTRAINT products_data_kind_check CHECK (data_kind IN ('DEMO', 'REFERENCE'));
-- Thay đổi cấu trúc/ràng buộc bảng trong phiên bản migration này, không phải câu lệnh chạy mỗi request.
ALTER TABLE product_variants
  ALTER COLUMN case_diameter_mm DROP NOT NULL,
  ALTER COLUMN warranty_months DROP NOT NULL,
  ADD COLUMN case_dimensions_mm VARCHAR(100),
  ADD COLUMN price_source_name VARCHAR(120),
  ADD COLUMN price_source_url TEXT,
  ADD COLUMN price_checked_at TIMESTAMPTZ(3);
-- Thay đổi cấu trúc/ràng buộc bảng trong phiên bản migration này, không phải câu lệnh chạy mỗi request.
ALTER TABLE order_items ALTER COLUMN warranty_months DROP NOT NULL;
-- Tạo index/unique index cho truy vấn hoặc chặn bản ghi trùng; xem tên cột để hiểu phạm vi.
CREATE INDEX products_data_kind_status_idx ON products(data_kind, status);
