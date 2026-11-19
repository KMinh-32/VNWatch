-- BẢN HỌC TẬP, KHÔNG DÙNG CHẠY MIGRATION
-- Nguồn gốc: outputs/vnwatch-backend/prisma/migrations/202610010003_cod_orders/migration.sql
-- Migration gốc được giữ nguyên checksum.
-- Enum PostgreSQL giới hạn giá trị hợp lệ ngay tại database, kể cả ghi ngoài HTTP API.
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
-- Enum PostgreSQL giới hạn giá trị hợp lệ ngay tại database, kể cả ghi ngoài HTTP API.
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID');
-- Enum PostgreSQL giới hạn giá trị hợp lệ ngay tại database, kể cả ghi ngoài HTTP API.
CREATE TYPE "ShippingStatus" AS ENUM ('NOT_SHIPPED', 'IN_TRANSIT', 'DELIVERED');

-- Tạo bảng orders: đọc cột NOT NULL/default, khóa chính, unique, foreign key và CHECK phía dưới.
CREATE TABLE "orders" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "idempotency_key" UUID NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "shipping_status" "ShippingStatus" NOT NULL DEFAULT 'NOT_SHIPPED',
  "recipient_name" VARCHAR(80) NOT NULL,
  "phone" VARCHAR(16) NOT NULL,
  "address" VARCHAR(500) NOT NULL,
  "subtotal_vnd" INTEGER NOT NULL,
  "shipping_fee_vnd" INTEGER NOT NULL,
  "total_vnd" INTEGER NOT NULL,
  "payment_method" VARCHAR(8) NOT NULL DEFAULT 'COD',
  "warranty_policy" VARCHAR(500) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "order_money_valid" CHECK ("subtotal_vnd" >= 0 AND "shipping_fee_vnd" >= 0 AND "total_vnd"::bigint = "subtotal_vnd"::bigint + "shipping_fee_vnd"::bigint),
  CONSTRAINT "order_cod_only" CHECK ("payment_method" = 'COD'),
  CONSTRAINT "order_state_valid" CHECK (
    ("status" = 'PENDING' AND "payment_status" = 'UNPAID' AND "shipping_status" = 'NOT_SHIPPED') OR
    ("status" = 'CONFIRMED' AND "payment_status" = 'UNPAID' AND "shipping_status" IN ('NOT_SHIPPED', 'IN_TRANSIT')) OR
    ("status" = 'COMPLETED' AND "payment_status" = 'PAID' AND "shipping_status" = 'DELIVERED') OR
    ("status" = 'CANCELLED' AND "payment_status" = 'UNPAID' AND "shipping_status" = 'NOT_SHIPPED')
  )
);
-- Tạo index/unique index cho truy vấn hoặc chặn bản ghi trùng; xem tên cột để hiểu phạm vi.
CREATE UNIQUE INDEX "orders_user_id_idempotency_key_key" ON "orders"("user_id", "idempotency_key");
-- Tạo index/unique index cho truy vấn hoặc chặn bản ghi trùng; xem tên cột để hiểu phạm vi.
CREATE INDEX "orders_user_id_created_at_id_idx" ON "orders"("user_id", "created_at", "id");
-- Tạo index/unique index cho truy vấn hoặc chặn bản ghi trùng; xem tên cột để hiểu phạm vi.
CREATE INDEX "orders_status_created_at_id_idx" ON "orders"("status", "created_at", "id");

-- Tạo bảng order_items: đọc cột NOT NULL/default, khóa chính, unique, foreign key và CHECK phía dưới.
CREATE TABLE "order_items" (
  "id" UUID NOT NULL PRIMARY KEY,
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "variant_id" UUID NOT NULL REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "product_name" VARCHAR(200) NOT NULL,
  "variant_label" VARCHAR(120) NOT NULL,
  "sku" VARCHAR(64) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_vnd" INTEGER NOT NULL,
  "line_total_vnd" INTEGER NOT NULL,
  "warranty_months" INTEGER NOT NULL,
  CONSTRAINT "order_line_valid" CHECK ("quantity" BETWEEN 1 AND 99 AND "unit_price_vnd" >= 0 AND "warranty_months" >= 0 AND "line_total_vnd"::bigint = "quantity"::bigint * "unit_price_vnd"::bigint)
);
-- Tạo index/unique index cho truy vấn hoặc chặn bản ghi trùng; xem tên cột để hiểu phạm vi.
CREATE UNIQUE INDEX "order_items_order_id_variant_id_key" ON "order_items"("order_id", "variant_id");

-- Tạo bảng order_events: đọc cột NOT NULL/default, khóa chính, unique, foreign key và CHECK phía dưới.
CREATE TABLE "order_events" (
  "id" UUID NOT NULL PRIMARY KEY,
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "action" VARCHAR(32) NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Tạo index/unique index cho truy vấn hoặc chặn bản ghi trùng; xem tên cột để hiểu phạm vi.
CREATE INDEX "order_events_order_id_created_at_id_idx" ON "order_events"("order_id", "created_at", "id");
