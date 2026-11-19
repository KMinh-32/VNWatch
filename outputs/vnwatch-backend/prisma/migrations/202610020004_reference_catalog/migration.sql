ALTER TABLE products
  ADD COLUMN data_kind VARCHAR(16) NOT NULL DEFAULT 'DEMO',
  ADD COLUMN source_name VARCHAR(120),
  ADD COLUMN source_url TEXT,
  ADD COLUMN source_checked_at TIMESTAMPTZ(3),
  ADD COLUMN image_source_url TEXT,
  ADD CONSTRAINT products_data_kind_check CHECK (data_kind IN ('DEMO', 'REFERENCE'));
ALTER TABLE product_variants
  ALTER COLUMN case_diameter_mm DROP NOT NULL,
  ALTER COLUMN warranty_months DROP NOT NULL,
  ADD COLUMN case_dimensions_mm VARCHAR(100),
  ADD COLUMN price_source_name VARCHAR(120),
  ADD COLUMN price_source_url TEXT,
  ADD COLUMN price_checked_at TIMESTAMPTZ(3);
ALTER TABLE order_items ALTER COLUMN warranty_months DROP NOT NULL;
CREATE INDEX products_data_kind_status_idx ON products(data_kind, status);
