CREATE TYPE "CatalogStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISCONTINUED');
CREATE TYPE "MovementType" AS ENUM ('QUARTZ', 'AUTOMATIC', 'MECHANICAL', 'SOLAR');

CREATE TABLE "products" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "brand" VARCHAR(100) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "description" TEXT NOT NULL,
  "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_variants" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "sku" VARCHAR(64) NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "price_vnd" INTEGER NOT NULL,
  "stock_quantity" INTEGER NOT NULL DEFAULT 0,
  "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
  "movement_type" "MovementType" NOT NULL,
  "case_diameter_mm" DECIMAL(5,2) NOT NULL,
  "case_material" VARCHAR(100) NOT NULL,
  "crystal_material" VARCHAR(100) NOT NULL,
  "strap_material" VARCHAR(100) NOT NULL,
  "water_resistance_m" INTEGER NOT NULL,
  "warranty_months" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_variants_price_nonnegative" CHECK ("price_vnd" >= 0),
  CONSTRAINT "product_variants_stock_nonnegative" CHECK ("stock_quantity" >= 0),
  CONSTRAINT "product_variants_diameter_positive" CHECK ("case_diameter_mm" > 0),
  CONSTRAINT "product_variants_water_nonnegative" CHECK ("water_resistance_m" >= 0),
  CONSTRAINT "product_variants_warranty_nonnegative" CHECK ("warranty_months" >= 0),
  CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id")
    REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_status_created_at_id_idx" ON "products"("status", "created_at", "id");
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE INDEX "product_variants_product_id_status_price_vnd_idx" ON "product_variants"("product_id", "status", "price_vnd");
