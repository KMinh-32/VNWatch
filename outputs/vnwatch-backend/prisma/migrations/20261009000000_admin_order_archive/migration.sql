ALTER TABLE orders ADD COLUMN archived_at TIMESTAMPTZ(3);
ALTER TABLE orders ADD CONSTRAINT orders_archive_terminal CHECK (archived_at IS NULL OR status IN ('COMPLETED', 'CANCELLED'));
CREATE INDEX orders_archive_status_created_idx ON orders(archived_at, status, created_at, id);
