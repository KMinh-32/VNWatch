/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/catalog/catalog.controller.ts
 * Cửa vào HTTP của danh mục công khai. Controller nhận tham số hợp lệ rồi giao việc cho service.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorDto } from '../common/api-error.dto';
import { CatalogService } from './catalog.service';
import { Public } from '../auth/auth.decorators';
import { ListProductsDto } from './dto/list-products.dto';
import { ProductDto, ProductPageDto } from './dto/product-response.dto';

/** Controller ánh xạ HTTP → service; decorator class/route là nơi khai báo xác thực và quyền truy cập. */
@ApiTags('Catalog (public)')
@ApiBadRequestResponse({ type: ApiErrorDto })
@Controller('products')
export class CatalogController {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly catalog: CatalogService) {}

  /** GET /api/v1/products. Nhận bộ lọc query rồi gọi CatalogService.list, trả trang danh mục. */
  @Get()
  @Public()
  @ApiOperation({
    summary:
      'List active products with active SKUs. No authentication required.',
  })
  @ApiOkResponse({ type: ProductPageDto })
  list(@Query() query: ListProductsDto): Promise<ProductPageDto> {
    return this.catalog.list(query);
  }

  /** GET /api/v1/products/:id. Nhận UUID mẫu rồi gọi CatalogService.findOne, trả chi tiết công khai. */
  @Get('facets')
  @Public()
  @ApiOperation({
    summary: 'Thương hiệu, chất liệu dây và kính của catalog đang bán.',
  })
  facets(@Query() query: ListProductsDto) {
    return this.catalog.facets(query.dataKind);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Read one active product by UUID. No authentication required.',
  })
  @ApiOkResponse({ type: ProductDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ProductDto> {
    return this.catalog.findOne(id);
  }
}
