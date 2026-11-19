/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/catalog/catalog.repository.ts
 * Tầng truy vấn Prisma: lọc mẫu và SKU đang bán, sắp xếp và phân trang trên cùng điều kiện.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ListProductsDto } from './dto/list-products.dto';

// Prisma contains uses SQL LIKE. Escape its wildcard characters for literal search.
/** Escape dấu %, _ và backslash để từ khóa là văn bản literal thay vì wildcard của SQL LIKE. */
function literalSearch(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class CatalogRepository {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly prisma: PrismaService) {}

  /** Dùng cùng điều kiện SKU cho lọc mẫu và SKU trả về; phân trang/số lượng chạy trong snapshot RepeatableRead. */
  list(query: ListProductsDto) {
    const variants: Prisma.ProductVariantWhereInput = {
      status: 'ACTIVE',
      ...(query.strapMaterial
        ? {
            strapMaterial: {
              equals: literalSearch(query.strapMaterial),
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query.crystalMaterial
        ? {
            crystalMaterial: {
              equals: literalSearch(query.crystalMaterial),
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query.minDiameterMm !== undefined || query.maxDiameterMm !== undefined
        ? {
            caseDiameterMm: {
              gte: query.minDiameterMm,
              lte: query.maxDiameterMm,
            },
          }
        : {}),
      priceVnd: { gte: query.minPriceVnd, lte: query.maxPriceVnd },
      ...(query.movementType ? { movementType: query.movementType } : {}),
      ...(query.inStock
        ? { stockQuantity: query.inStock === 'true' ? { gt: 0 } : 0 }
        : {}),
    };
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(query.dataKind ? { dataKind: query.dataKind } : {}),
      ...(query.brand
        ? {
            brand: {
              equals: literalSearch(query.brand),
              mode: 'insensitive' as const,
            },
          }
        : {}),
      // Một SKU phải thỏa đồng thời toàn bộ bộ lọc; không ghép giá rẻ của SKU A với tồn của SKU B.
      variants: { some: variants },
      ...(query.category
        ? { category: { equals: query.category, mode: 'insensitive' as const } }
        : {}),
      ...(query.q
        ? {
            OR: [
              {
                name: {
                  contains: literalSearch(query.q),
                  mode: 'insensitive' as const,
                },
              },
              {
                brand: {
                  contains: literalSearch(query.q),
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
    // Giá sắp xếp của mẫu là giá thấp nhất trong các SKU đang khớp bộ lọc, không phải SKU bất kỳ.
    if (query.sort === 'price_asc' || query.sort === 'price_desc')
      return this.prisma.$transaction(
        async (tx) => {
          const ranked = await tx.productVariant.groupBy({
            by: ['productId'],
            where: { ...variants, product: where },
            _min: { priceVnd: true },
            orderBy: [
              {
                _min: { priceVnd: query.sort === 'price_asc' ? 'asc' : 'desc' },
              },
              { productId: 'asc' },
            ],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
          });
          const rows = await tx.product.findMany({
            where: { id: { in: ranked.map((r) => r.productId) } },
            include: { variants: { where: variants, orderBy: { sku: 'asc' } } },
          });
          const total = await tx.product.count({ where });
          return [
            // findMany theo danh sách ID không tự giữ thứ tự rank; ánh xạ lại theo thứ tự groupBy đã phân trang.
            ranked.map((r) => rows.find((p) => p.id === r.productId)!),
            total,
          ] as [typeof rows, number];
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'name_asc'
        ? [{ name: 'asc' }, { id: 'asc' }]
        : [{ createdAt: 'desc' }, { id: 'asc' }];
    // Count and page see the same snapshot, even if a product changes between queries.
    return this.prisma.$transaction(
      [
        this.prisma.product.findMany({
          where,
          include: { variants: { where: variants, orderBy: { sku: 'asc' } } },
          orderBy,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.product.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  /** Danh sách bộ lọc luôn lấy từ catalog đang bán, gồm cả các hãng vừa được admin thêm. */
  async facets(dataKind?: 'DEMO' | 'REFERENCE') {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        ...(dataKind ? { dataKind } : {}),
        variants: { some: { status: 'ACTIVE' } },
      },
      select: {
        brand: true,
        variants: {
          where: { status: 'ACTIVE' },
          select: { strapMaterial: true, crystalMaterial: true },
        },
      },
    });
    const unique = (values: string[]) =>
      [...new Set(values)].sort((a, b) => a.localeCompare(b, 'vi'));
    return {
      brands: unique(products.map((p) => p.brand)),
      strapMaterials: unique(
        products.flatMap((p) => p.variants.map((v) => v.strapMaterial)),
      ),
      crystalMaterials: unique(
        products.flatMap((p) => p.variants.map((v) => v.crystalMaterial)),
      ),
    };
  }

  /** Chỉ đọc mẫu ACTIVE có ít nhất một SKU ACTIVE; không đưa mẫu nháp/ngừng bán ra danh mục. */
  findVisible(id: string) {
    return this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE', variants: { some: { status: 'ACTIVE' } } },
      include: {
        variants: { where: { status: 'ACTIVE' }, orderBy: { sku: 'asc' } },
      },
    });
  }
}
