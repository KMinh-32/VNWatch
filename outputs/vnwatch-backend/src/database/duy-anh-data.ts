/** Nhập dữ liệu công khai từ Duy Anh, giữ nguyên giá/tồn của SKU đã có khi chạy lại. */
import { PrismaService } from './prisma.service';
import { MovementType } from '../generated/prisma/client';
import products from './duy-anh-products.json';

export async function seedDuyAnh(prisma: PrismaService, initialStock = 100) {
  await prisma.$transaction(
    async (tx) => {
      for (const p of products) {
        // SKU là khóa nghiệp vụ. Chỉ tạo mới nếu mã này chưa được nhập trước đó.
        if (
          await tx.productVariant.findUnique({
            where: { sku: p.sku },
            select: { id: true },
          })
        )
          continue;
        const product = await tx.product.upsert({
          where: { slug: p.slug },
          update: {},
          create: {
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            category: p.category,
            description: p.description,
            status: 'ACTIVE',
            dataKind: 'REFERENCE',
            imageUrls: [p.image],
            imageSourceUrl: p.sourceUrl,
            sourceName: p.sourceName,
            sourceUrl: p.sourceUrl,
            sourceCheckedAt: new Date(p.checkedAt),
          },
        });
        await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: p.sku,
            label: p.label,
            priceVnd: p.priceVnd,
            stockQuantity: initialStock,
            status: 'ACTIVE',
            movementType: p.movementType as MovementType,
            caseDiameterMm: p.diameter,
            caseDimensionsMm: p.dimensions,
            caseMaterial: p.caseMaterial,
            crystalMaterial: p.crystalMaterial,
            strapMaterial: p.strapMaterial,
            waterResistanceM: p.waterResistanceM,
            warrantyMonths: null,
            priceSourceName: p.sourceName,
            priceSourceUrl: p.sourceUrl,
            priceCheckedAt: new Date(p.checkedAt),
          },
        });
      }
    },
    { timeout: 20000 },
  );
}
