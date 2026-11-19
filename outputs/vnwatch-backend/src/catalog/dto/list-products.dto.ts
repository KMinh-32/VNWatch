/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/catalog/dto/list-products.dto.ts
 * DTO bộ lọc danh mục. Query HTTP ban đầu là chuỗi; Transform chuyển kiểu và decorator kiểm tra giới hạn.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Chỉ chuyển chuỗi số nguyên hợp lệ thành number; giữ giá trị sai để validator báo lỗi. */
const integer = ({ value }: { value: unknown }): number =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
/** Loại khoảng trắng đầu/cuối của query chuỗi trước khi áp dụng validator. */
const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
export const MAX_PRICE_VND = 2_147_483_647;

/** ListProductsDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ListProductsDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  strapMaterial?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  crystalMaterial?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^\d+(?:\.\d{1,2})?$/.test(value) ? Number(value) : NaN)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  minDiameterMm?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^\d+(?:\.\d{1,2})?$/.test(value) ? Number(value) : NaN)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  maxDiameterMm?: number;

  // Loại máy: quartz, automatic, mechanical hoặc solar. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional().
  @ApiPropertyOptional({ enum: ['QUARTZ', 'AUTOMATIC', 'MECHANICAL', 'SOLAR'] })
  @IsOptional()
  @IsIn(['QUARTZ', 'AUTOMATIC', 'MECHANICAL', 'SOLAR'])
  movementType?: 'QUARTZ' | 'AUTOMATIC' | 'MECHANICAL' | 'SOLAR';
  // Cờ khả dụng suy ra từ tồn; không phải giữ chỗ cho khách. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional().
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  inStock?: 'true' | 'false';
  // DEMO là dữ liệu giả, REFERENCE là mẫu thật có nguồn tham khảo. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional().
  @ApiPropertyOptional({
    enum: ['DEMO', 'REFERENCE'],
    description: 'Omit to include both datasets.',
  })
  @IsOptional()
  @IsIn(['DEMO', 'REFERENCE'])
  dataKind?: 'DEMO' | 'REFERENCE';

  // Tên thương hiệu của mẫu. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), MinLength(1), MaxLength(100).
  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Exact brand, case-insensitive.',
  })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  brand?: string;

  // Trang bắt đầu từ 1. Kiểm tra: IsInt({ message: 'page phải là số nguyên.' }), Min(1, { message: 'page phải từ 1 đến 1000.' }), Max(1000, { message: 'page phải từ 1 đến 1000.' }).
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1000 })
  @Transform(integer)
  @IsInt({ message: 'page phải là số nguyên.' })
  @Min(1, { message: 'page phải từ 1 đến 1000.' })
  @Max(1000, { message: 'page phải từ 1 đến 1000.' })
  page = 1;

  // Số bản ghi tối đa mỗi trang. Kiểm tra: IsInt({ message: 'limit phải là số nguyên.' }), Min(1, { message: 'limit phải từ 1 đến 50.' }), Max(50, { message: 'limit phải từ 1 đến 50.' }).
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Transform(integer)
  @IsInt({ message: 'limit phải là số nguyên.' })
  @Min(1, { message: 'limit phải từ 1 đến 50.' })
  @Max(50, { message: 'limit phải từ 1 đến 50.' })
  limit = 20;

  // Từ khóa tìm kiếm do user nhập. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), MinLength(1, { message: 'q không được rỗng.' }), MaxLength(100, { message: 'q tối đa 100 ký tự.' }).
  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Case-insensitive literal substring in product name or brand.',
  })
  @IsOptional()
  @Transform(trimmed)
  @IsString({ message: 'q phải là chuỗi.' })
  @MinLength(1, { message: 'q không được rỗng.' })
  @MaxLength(100, { message: 'q tối đa 100 ký tự.' })
  q?: string;

  // Nhóm sản phẩm cho bộ lọc. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), MinLength(1, { message: 'category không được rỗng.' }), MaxLength(100, { message: 'category tối đa 100 ký tự.' }).
  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Exact category, case-insensitive.',
  })
  @IsOptional()
  @Transform(trimmed)
  @IsString({ message: 'category phải là chuỗi.' })
  @MinLength(1, { message: 'category không được rỗng.' })
  @MaxLength(100, { message: 'category tối đa 100 ký tự.' })
  category?: string;

  // Cận dưới ngân sách VND. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), IsInt({ message: 'minPriceVnd phải là số nguyên VND.' }), Min(0, { message: 'minPriceVnd không được âm.' }), Max(MAX_PRICE_VND, { message: 'minPriceVnd vượt giới hạn.' }).
  @ApiPropertyOptional({
    minimum: 0,
    maximum: MAX_PRICE_VND,
    description: 'Integer VND. Returned variants also satisfy the price range.',
  })
  @IsOptional()
  @Transform(integer)
  @IsInt({ message: 'minPriceVnd phải là số nguyên VND.' })
  @Min(0, { message: 'minPriceVnd không được âm.' })
  @Max(MAX_PRICE_VND, { message: 'minPriceVnd vượt giới hạn.' })
  minPriceVnd?: number;

  // Cận trên ngân sách VND. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsOptional(), IsInt({ message: 'maxPriceVnd phải là số nguyên VND.' }), Min(0, { message: 'maxPriceVnd không được âm.' }), Max(MAX_PRICE_VND, { message: 'maxPriceVnd vượt giới hạn.' }).
  @ApiPropertyOptional({ minimum: 0, maximum: MAX_PRICE_VND })
  @IsOptional()
  @Transform(integer)
  @IsInt({ message: 'maxPriceVnd phải là số nguyên VND.' })
  @Min(0, { message: 'maxPriceVnd không được âm.' })
  @Max(MAX_PRICE_VND, { message: 'maxPriceVnd vượt giới hạn.' })
  maxPriceVnd?: number;

  // Thứ tự sắp xếp thuộc danh sách cho phép.
  @ApiPropertyOptional({
    enum: ['newest', 'name_asc', 'price_asc', 'price_desc'],
    default: 'newest',
  })
  @IsIn(['newest', 'name_asc', 'price_asc', 'price_desc'], {
    message: 'sort chỉ nhận newest, name_asc, price_asc hoặc price_desc.',
  })
  sort: 'newest' | 'name_asc' | 'price_asc' | 'price_desc' = 'newest';
}
