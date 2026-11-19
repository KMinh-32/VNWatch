-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount_vnd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promotion_code" VARCHAR(32);

-- CreateTable
CREATE TABLE "cart_lines" (
    "user_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cart_lines_pkey" PRIMARY KEY ("user_id","variant_id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","product_id")
);

-- CreateTable
CREATE TABLE "saved_addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "recipient_name" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_audits" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "target_id" VARCHAR(100) NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "amount_vnd" INTEGER NOT NULL,
    "min_subtotal_vnd" INTEGER NOT NULL,
    "max_uses" INTEGER NOT NULL,
    "per_user_limit" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_uses" (
    "id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "order_item_id" UUID,
    "kind" VARCHAR(16) NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_name" VARCHAR(80) NOT NULL,
    "author_role" VARCHAR(16) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_addresses_user_id_created_at_idx" ON "saved_addresses"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "business_audits_created_at_id_idx" ON "business_audits"("created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_uses_order_id_key" ON "promotion_uses"("order_id");

-- CreateIndex
CREATE INDEX "promotion_uses_promotion_id_user_id_idx" ON "promotion_uses"("promotion_id", "user_id");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_created_at_idx" ON "support_tickets"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_status_created_at_idx" ON "support_tickets"("status", "created_at");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_created_at_idx" ON "ticket_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_hidden_created_at_idx" ON "product_reviews"("product_id", "hidden", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_user_id_product_id_key" ON "product_reviews"("user_id", "product_id");

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_addresses" ADD CONSTRAINT "saved_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_audits" ADD CONSTRAINT "business_audits_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_uses" ADD CONSTRAINT "promotion_uses_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_uses" ADD CONSTRAINT "promotion_uses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_uses" ADD CONSTRAINT "promotion_uses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_quantity_range" CHECK ("quantity" BETWEEN 1 AND 99); ALTER TABLE "product_reviews" ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5); ALTER TABLE "orders" ADD CONSTRAINT "order_discount_range" CHECK ("discount_vnd" >= 0 AND "discount_vnd" <= "subtotal_vnd"); ALTER TABLE "promotions" ADD CONSTRAINT "promotion_bounds" CHECK ("amount_vnd" > 0 AND "min_subtotal_vnd" >= 0 AND "max_uses" > 0 AND "per_user_limit" > 0 AND "ends_at" > "starts_at");
ALTER TABLE "orders" DROP CONSTRAINT "order_money_valid"; ALTER TABLE "orders" ADD CONSTRAINT "order_money_valid" CHECK ("subtotal_vnd" >= 0 AND "shipping_fee_vnd" >= 0 AND "total_vnd"::bigint = "subtotal_vnd"::bigint - "discount_vnd"::bigint + "shipping_fee_vnd"::bigint); ALTER TABLE "support_tickets" ADD CONSTRAINT "ticket_values" CHECK ("kind" IN ('GENERAL', 'ORDER', 'WARRANTY') AND "status" IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'));
