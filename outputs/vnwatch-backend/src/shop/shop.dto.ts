/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/shop/shop.dto.ts
 * DTO dữ liệu mua sắm và quản trị; kiểm tra số lượng, URL ảnh, giá/tồn, timestamp và lý do thay đổi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { trimText } from '../users/user.dto';
import { OrderPageQuery } from '../orders/order.dto';

/** ReasonDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ReasonDto {
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(500).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
/** CartWriteDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class CartWriteDto {
  // ID SKU/phiên bản cụ thể được bán và quản lý tồn riêng. Kiểm tra: IsUUID('4').
  @ApiProperty() @IsUUID('4') variantId!: string;
  // Chế độ hội thoại/provider hoặc thao tác giỏ, theo hợp đồng của file.
  @ApiProperty({ enum: ['ADD', 'SET'] }) @IsIn(['ADD', 'SET']) mode!:
    'ADD' | 'SET';
  // Số lượng của dòng hàng; có giới hạn tùy DTO. Kiểm tra: IsInt(), Min(0), Max(99).
  @ApiProperty() @IsInt() @Min(0) @Max(99) quantity!: number;
}
/** AddressDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AddressDto {
  // Nhãn hiển thị của lựa chọn/đối tượng. Kiểm tra: MinLength(1), MaxLength(40).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label!: string;
  // Tên người nhận hàng. Kiểm tra: MinLength(2), MaxLength(80).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  recipientName!: string;
  // Số điện thoại người nhận. Kiểm tra: Matches(/^(0\d{9}|\+84\d{9})$/).
  @ApiProperty()
  @Transform(trimText)
  @Matches(/^(0\d{9}|\+84\d{9})$/)
  phone!: string;
  // Địa chỉ nhận hàng. Kiểm tra: MinLength(10), MaxLength(500).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  address!: string;
}
/** TicketDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class TicketDto {
  // Loại yêu cầu hỗ trợ.
  @ApiProperty({ enum: ['GENERAL', 'ORDER', 'WARRANTY'] })
  @IsIn(['GENERAL', 'ORDER', 'WARRANTY'])
  kind!: string;
  // Tiêu đề ticket. Kiểm tra: MinLength(5), MaxLength(120).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  subject!: string;
  // Nội dung tin nhắn/đánh giá hoặc JSON request tùy hợp đồng. Kiểm tra: MinLength(10), MaxLength(2000).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body!: string;
  // ID đơn hàng liên quan. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsUUID('4').
  @ApiPropertyOptional()
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsUUID('4')
  orderId?: string;
  // ID dòng hàng trong đơn, dùng cho yêu cầu bảo hành. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsUUID('4').
  @ApiPropertyOptional()
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsUUID('4')
  orderItemId?: string;
}
/** ReplyDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ReplyDto {
  // Nội dung tin nhắn/đánh giá hoặc JSON request tùy hợp đồng. Kiểm tra: MinLength(5), MaxLength(2000).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  body!: string;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  @ApiPropertyOptional({ enum: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'] })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'])
  status?: string;
}
/** ReviewDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ReviewDto {
  // Điểm đánh giá từ 1 đến 5. Kiểm tra: IsInt(), Min(1), Max(5).
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating!: number;
  // Nội dung tin nhắn/đánh giá hoặc JSON request tùy hợp đồng. Kiểm tra: MinLength(10), MaxLength(1000).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  body!: string;
}
/** VisibilityDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class VisibilityDto extends ReasonDto {
  // Cờ kiểm duyệt; true không xuất hiện ở đánh giá công khai.
  @ApiProperty() @IsBoolean() hidden!: boolean;
}
/** ShopPageQuery: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ShopPageQuery extends OrderPageQuery {
  // Từ khóa tìm kiếm do user nhập. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: MaxLength(100).
  @ApiPropertyOptional()
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @Transform(trimText)
  @IsString()
  @MaxLength(100)
  q?: string;
}
/** ManagementProductsQuery: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ManagementProductsQuery extends ShopPageQuery {
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'DISCONTINUED'] })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['DRAFT', 'ACTIVE', 'DISCONTINUED'])
  status?: 'DRAFT' | 'ACTIVE' | 'DISCONTINUED';
}
/** ManagementTicketsQuery: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ManagementTicketsQuery extends ShopPageQuery {
  // Nhóm trạng thái dịch vụ hoặc bộ lọc ticket theo hợp đồng tương ứng.
  @ApiPropertyOptional({ enum: ['all', 'open', 'closed'], default: 'all' })
  @IsIn(['all', 'open', 'closed'])
  state: 'all' | 'open' | 'closed' = 'all';
}
export class ProductFields {
  // Danh sách URL ảnh; client có thể thử ảnh kế tiếp khi lỗi. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: ArrayMaxSize(5), IsUrl({ protocols: ['https'], require_protocol: true }, { each: true }), MaxLength(2000, { each: true }).
  @ApiPropertyOptional({ type: [String] })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  @MaxLength(2000, { each: true })
  imageUrls?: string[];
  // Tên rút gọn duy nhất của mẫu để tra cứu/định danh. Kiểm tra: Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), MaxLength(120).
  @ApiProperty()
  @Transform(trimText)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(120)
  slug!: string;
  // Tên đối tượng dùng để hiển thị. Kiểm tra: MinLength(2), MaxLength(200).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;
  // Tên thương hiệu của mẫu. Kiểm tra: MinLength(2), MaxLength(100).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  brand!: string;
  // Nhóm sản phẩm cho bộ lọc.
  @ApiProperty() @IsIn(['dress', 'sport']) category!: string;
  // Mô tả được lưu trong catalog. Kiểm tra: MinLength(10), MaxLength(5000).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  @ApiProperty() @IsIn(['DRAFT', 'ACTIVE', 'DISCONTINUED']) status!:
    'DRAFT' | 'ACTIVE' | 'DISCONTINUED';
}
export class VariantFields {
  // Nhãn hiển thị của lựa chọn/đối tượng. Kiểm tra: MinLength(2), MaxLength(120).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string;
  // Đơn giá nguyên VND, không dùng số thực để tính tiền. Kiểm tra: IsInt(), Min(1), Max(2147483647).
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) priceVnd!: number;
  // Tồn thực của SKU; backend thay đổi trong transaction. Kiểm tra: IsInt(), Min(0), Max(1000000).
  @ApiProperty() @IsInt() @Min(0) @Max(1000000) stockQuantity!: number;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  @ApiProperty() @IsIn(['DRAFT', 'ACTIVE', 'DISCONTINUED']) status!:
    'DRAFT' | 'ACTIVE' | 'DISCONTINUED';
  // Loại máy: quartz, automatic, mechanical hoặc solar.
  @ApiProperty()
  @IsIn(['QUARTZ', 'AUTOMATIC', 'MECHANICAL', 'SOLAR'])
  movementType!: 'QUARTZ' | 'AUTOMATIC' | 'MECHANICAL' | 'SOLAR';
  // Đường kính mm; có thể null nếu nguồn chỉ cung cấp kích thước khác. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: Min(1), Max(100).
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  caseDiameterMm?: number | null;
  // Chất liệu vỏ. Kiểm tra: MinLength(2), MaxLength(100).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  caseMaterial!: string;
  // Chất liệu mặt kính. Kiểm tra: MinLength(2), MaxLength(100).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  crystalMaterial!: string;
  // Chất liệu dây. Kiểm tra: MinLength(2), MaxLength(100).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  strapMaterial!: string;
  // Thông số chống nước theo mét do catalog lưu. Kiểm tra: IsInt(), Min(0), Max(2000).
  @ApiProperty() @IsInt() @Min(0) @Max(2000) waterResistanceM!: number;
  // Số tháng bảo hành; null nghĩa chưa xác định, không tự tạo bảo hành. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: IsInt(), Min(0), Max(120).
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsInt()
  @Min(0)
  @Max(120)
  warrantyMonths?: number | null;
}
/** NewVariantDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class NewVariantDto extends VariantFields {
  // Mã SKU duy nhất của phiên bản đồng hồ. Kiểm tra: Matches(/^[A-Za-z0-9_-]{2,64}$/).
  @ApiProperty()
  @Transform(trimText)
  @Matches(/^[A-Za-z0-9_-]{2,64}$/)
  sku!: string;
}
/** ProductCreateDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ProductCreateDto extends ProductFields {
  @ApiProperty({ type: NewVariantDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => NewVariantDto)
  variant!: NewVariantDto;
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(500).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
/** ProductWriteDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ProductWriteDto extends ProductFields {
  // Version client đã đọc; backend từ chối nếu bản ghi hiện tại đã đổi.
  @ApiProperty() @IsDateString() expectedUpdatedAt!: string;
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(500).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
/** ProductArchiveDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ProductArchiveDto extends ReasonDto {
  // Version client đã đọc; backend từ chối nếu bản ghi hiện tại đã đổi.
  @ApiProperty() @IsDateString() expectedUpdatedAt!: string;
}
/** VariantCreateDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class VariantCreateDto extends NewVariantDto {
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(500).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
/** VariantWriteDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class VariantWriteDto extends VariantFields {
  // Version client đã đọc; backend từ chối nếu bản ghi hiện tại đã đổi.
  @ApiProperty() @IsDateString() expectedUpdatedAt!: string;
  // Số tồn client đã đọc; điều kiện cập nhật ngăn ghi đè tồn mới sau đặt hàng. Kiểm tra: IsInt(), Min(0), Max(1000000).
  @ApiProperty() @IsInt() @Min(0) @Max(1000000) expectedStockQuantity!: number;
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(500).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
/** PromotionDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class PromotionDto extends ReasonDto {
  // Mã lỗi hoặc mã khuyến mãi tùy DTO/model. Kiểm tra: Matches(/^[A-Z0-9_-]{3,32}$/).
  @ApiProperty()
  @Transform(trimText)
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  code!: string;
  // Số tiền giảm cố định theo mã khuyến mãi. Kiểm tra: IsInt(), Min(1), Max(100000000).
  @ApiProperty() @IsInt() @Min(1) @Max(100000000) amountVnd!: number;
  // Giá trị tiền hàng tối thiểu để áp mã giảm giá. Kiểm tra: IsInt(), Min(0), Max(2147483647).
  @ApiProperty() @IsInt() @Min(0) @Max(2147483647) minSubtotalVnd!: number;
  // Tổng lượt dùng tối đa của mã. Kiểm tra: IsInt(), Min(1), Max(1000000).
  @ApiProperty() @IsInt() @Min(1) @Max(1000000) maxUses!: number;
  // Giới hạn lượt dùng cho mỗi user. Kiểm tra: IsInt(), Min(1), Max(100).
  @ApiProperty() @IsInt() @Min(1) @Max(100) perUserLimit!: number;
  // Thời điểm mã bắt đầu hợp lệ.
  @ApiProperty() @IsDateString() startsAt!: string;
  // Thời điểm mã hết hiệu lực.
  @ApiProperty() @IsDateString() endsAt!: string;
}
/** ActiveDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ActiveDto extends ReasonDto {
  // Cờ đang hoạt động; ý nghĩa cụ thể tùy đối tượng.
  @ApiProperty() @IsBoolean() active!: boolean;
}
