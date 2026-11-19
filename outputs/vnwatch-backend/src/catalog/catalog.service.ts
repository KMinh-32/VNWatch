/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/catalog/catalog.service.ts
 * Nghiệp vụ danh mục: kiểm tra khoảng giá, phối hợp repository và chỉ trả các trường công khai.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { CatalogRepository } from './catalog.repository';
import { ListProductsDto } from './dto/list-products.dto';
import { ProductDto, ProductPageDto } from './dto/product-response.dto';

/** Kiểu ProductWithVariants mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
type ProductWithVariants = Prisma.ProductGetPayload<{
  include: { variants: true };
}>;

/** Chuyển Date/Decimal thành chuỗi JSON, ẩn tồn chi tiết và trả inStock từ stockQuantity > 0. */
function toDto(product: ProductWithVariants): ProductDto {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    imageUrls: product.imageUrls,
    dataKind: product.dataKind,
    sourceName: product.sourceName,
    sourceUrl: product.sourceUrl,
    sourceCheckedAt: product.sourceCheckedAt?.toISOString() ?? null,
    imageSourceUrl: product.imageSourceUrl,
    createdAt: product.createdAt.toISOString(),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      label: variant.label,
      priceVnd: variant.priceVnd,
      inStock: variant.stockQuantity > 0,
      movementType: variant.movementType,
      caseDiameterMm: variant.caseDiameterMm?.toFixed(2) ?? null,
      caseDimensionsMm: variant.caseDimensionsMm,
      priceSourceName: variant.priceSourceName,
      priceSourceUrl: variant.priceSourceUrl,
      priceCheckedAt: variant.priceCheckedAt?.toISOString() ?? null,
      caseMaterial: variant.caseMaterial,
      crystalMaterial: variant.crystalMaterial,
      strapMaterial: variant.strapMaterial,
      waterResistanceM: variant.waterResistanceM,
      warrantyMonths: variant.warrantyMonths,
    })),
  };
}

/** Service tập trung nghiệp vụ; các dependency được tiêm qua constructor để có thể kiểm thử độc lập. */
@Injectable()
export class CatalogService {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly repository: CatalogRepository) {}

  /** Từ chối khoảng giá đảo ngược, lấy dữ liệu/count rồi tạo meta phân trang. */
  async list(query: ListProductsDto): Promise<ProductPageDto> {
    if (
      query.minDiameterMm !== undefined &&
      query.maxDiameterMm !== undefined &&
      query.minDiameterMm > query.maxDiameterMm
    )
      throw new BadRequestException({
        code: 'INVALID_DIAMETER_RANGE',
        message: 'Đường kính tối thiểu không được lớn hơn tối đa.',
      });
    if (
      query.minPriceVnd !== undefined &&
      query.maxPriceVnd !== undefined &&
      query.minPriceVnd > query.maxPriceVnd
    ) {
      throw new BadRequestException({
        code: 'INVALID_PRICE_RANGE',
        message: 'Giá tối thiểu không được lớn hơn giá tối đa.',
      });
    }
    const [products, total] = await this.repository.list(query);
    return {
      data: products.map(toDto),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  facets(dataKind?: 'DEMO' | 'REFERENCE') {
    return this.repository.facets(dataKind);
  }

  /** Lấy một mẫu đang hiển thị; trả 404 nếu không có mẫu thuộc danh mục công khai. */
  async findOne(id: string): Promise<ProductDto> {
    const product = await this.repository.findVisible(id);
    if (!product)
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Không tìm thấy sản phẩm đang kinh doanh.',
      });
    return toDto(product);
  }
}
