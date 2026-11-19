ALTER TABLE orders DROP CONSTRAINT order_cod_only;
ALTER TABLE orders ADD CONSTRAINT order_payment_method_valid CHECK (payment_method IN ('COD','QR_DEMO'));
ALTER TABLE orders DROP CONSTRAINT order_state_valid;
ALTER TABLE orders ADD CONSTRAINT order_state_valid CHECK (
  (status='PENDING' AND shipping_status='NOT_SHIPPED' AND (payment_status='UNPAID' OR payment_method='QR_DEMO')) OR
  (status='CONFIRMED' AND ((payment_method='COD' AND payment_status='UNPAID' AND shipping_status IN ('NOT_SHIPPED','IN_TRANSIT')) OR (payment_method='QR_DEMO' AND ((payment_status='UNPAID' AND shipping_status='NOT_SHIPPED') OR (payment_status='PAID' AND shipping_status IN ('NOT_SHIPPED','IN_TRANSIT')))))) OR
  (status='COMPLETED' AND payment_status='PAID' AND shipping_status='DELIVERED') OR
  (status='CANCELLED' AND payment_status='UNPAID' AND shipping_status='NOT_SHIPPED')
);
