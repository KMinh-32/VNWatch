/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/demo-data.ts
 * Dữ liệu giả có ID ổn định để demo và kiểm thử. Upsert với update rỗng không ghi đè chỉnh sửa nghiệp vụ.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { PrismaClient } from '../generated/prisma/client';

export const demoIds = {
  everyday: '10000000-0000-4000-8000-000000000001',
  automatic: '10000000-0000-4000-8000-000000000002',
  archived: '10000000-0000-4000-8000-000000000003',
  black: '20000000-0000-4000-8000-000000000001',
  silver: '20000000-0000-4000-8000-000000000002',
  retired: '20000000-0000-4000-8000-000000000003',
  automaticSku: '20000000-0000-4000-8000-000000000004',
  archivedSku: '20000000-0000-4000-8000-000000000005',
};

// Fictional fixtures only. No real brands, serial numbers, customers or warranties.
/** Upsert mẫu/SKU demo bằng ID ổn định trong một transaction, không ghi đè bản ghi đã có. */
export async function seedDemo(
  prisma: PrismaClient,
  initialStock?: number,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const product of [
      {
        id: demoIds.everyday,
        slug: 'demo-everyday',
        name: 'DEMO Everyday',
        status: 'ACTIVE' as const,
      },
      {
        id: demoIds.automatic,
        slug: 'demo-automatic',
        name: 'DEMO Automatic',
        status: 'ACTIVE' as const,
      },
      {
        id: demoIds.archived,
        slug: 'demo-archived',
        name: 'DEMO Archived',
        status: 'DISCONTINUED' as const,
      },
    ]) {
      await tx.product.upsert({
        where: { id: product.id },
        update: {},
        create: {
          ...product,
          brand: 'VNWatch Demo (fictional)',
          category: 'dress',
          description:
            'Dữ liệu demo giả lập để kiểm thử. Không phải sản phẩm, thương hiệu hay thông số kinh doanh thật.',
        },
      });
    }
    for (const variant of [
      {
        id: demoIds.black,
        productId: demoIds.everyday,
        sku: 'DEMO-EVERYDAY-BLACK',
        label: 'Black / 38 mm',
        priceVnd: 1500000,
        stockQuantity: 10,
        status: 'ACTIVE' as const,
      },
      {
        id: demoIds.silver,
        productId: demoIds.everyday,
        sku: 'DEMO-EVERYDAY-SILVER',
        label: 'Silver / 38 mm',
        priceVnd: 3200000,
        stockQuantity: 5,
        status: 'ACTIVE' as const,
      },
      {
        id: demoIds.retired,
        productId: demoIds.everyday,
        sku: 'DEMO-EVERYDAY-RETIRED',
        label: 'Retired demo variant',
        priceVnd: 100000,
        stockQuantity: 1,
        status: 'DISCONTINUED' as const,
      },
      {
        id: demoIds.automaticSku,
        productId: demoIds.automatic,
        sku: 'DEMO-AUTOMATIC',
        label: 'Automatic / 38 mm',
        priceVnd: 4000000,
        stockQuantity: 0,
        status: 'ACTIVE' as const,
      },
      {
        id: demoIds.archivedSku,
        productId: demoIds.archived,
        sku: 'DEMO-ARCHIVED',
        label: 'Archived demo product',
        priceVnd: 1000000,
        stockQuantity: 1,
        status: 'ACTIVE' as const,
      },
    ]) {
      await tx.productVariant.upsert({
        where: { id: variant.id },
        update: {},
        create: {
          ...variant,
          stockQuantity: initialStock ?? variant.stockQuantity,
          movementType:
            variant.id === demoIds.automaticSku ? 'AUTOMATIC' : 'QUARTZ',
          caseDiameterMm: '38.00',
          caseMaterial: 'Demo stainless steel',
          crystalMaterial: 'Demo mineral glass',
          strapMaterial: 'Demo leather',
          waterResistanceM: 30,
          warrantyMonths: 12,
        },
      });
    }
  });
}
