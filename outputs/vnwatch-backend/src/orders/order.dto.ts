/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/orders/order.dto.ts
 * DTO báo giá/tạo đơn/chuyển trạng thái: chỉ nhận SKU và số lượng, không tin đơn giá do client tự tính.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { trimText } from '../users/user.dto';

/** OrderLineDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class OrderLineDto {
  // ID SKU/phiên bản cụ thể được bán và quản lý tồn riêng. Kiểm tra: IsUUID('4').
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') variantId!: string;
  // Số lượng của dòng hàng; có giới hạn tùy DTO. Kiểm tra: IsInt(), Min(1), Max(99).
  @ApiProperty({ minimum: 1, maximum: 99 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}
/** QuoteDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class QuoteDto {
  // COD hoặc QR_DEMO; dự án chưa thu tiền thật. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  @ApiPropertyOptional({ enum: ['COD', 'QR_DEMO'], default: 'COD' })
  @IsIn(['COD', 'QR_DEMO'])
  paymentMethod?: 'COD' | 'QR_DEMO' = 'COD';
  // Mã giảm giá được khách chọn và lưu vào đơn. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: Matches(/^[A-Z0-9_-]{3,32}$/).
  @ApiPropertyOptional({ maxLength: 32 })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  promotionCode?: string;
  // Các dòng SKU/số lượng hoặc snapshot đơn. Kiểm tra: ArrayMinSize(1), ArrayMaxSize(50), ValidateNested({ each: true }).
  @ApiProperty({ type: [OrderLineDto], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items!: OrderLineDto[];
}
/** CreateOrderDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class CreateOrderDto extends QuoteDto {
  // Tên người nhận hàng. Kiểm tra: MinLength(2), MaxLength(80).
  @ApiProperty({ minLength: 2, maxLength: 80 })
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  recipientName!: string;
  // Số điện thoại người nhận. Kiểm tra: Matches(/^(0\d{9}|\+84\d{9})$/, { message: 'Số điện thoại phải gồm 10 số bắt đầu bằng 0 hoặc dùng +84.', }).
  @ApiProperty({ example: '0901234567' })
  @Transform(trimText)
  @Matches(/^(0\d{9}|\+84\d{9})$/, {
    message: 'Số điện thoại phải gồm 10 số bắt đầu bằng 0 hoặc dùng +84.',
  })
  phone!: string;
  // Địa chỉ nhận hàng. Kiểm tra: MinLength(10), MaxLength(500).
  @ApiProperty({ minLength: 10, maxLength: 500 })
  @Transform(trimText)
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  address!: string;
  // Tổng khách đã xem; server đối chiếu lại để phát hiện giá thay đổi. Kiểm tra: IsInt(), Min(0), Max(2147483647).
  @ApiProperty({
    description:
      'User-confirmed quote total. Server recalculates and rejects changes.',
    minimum: 0,
    maximum: 2147483647,
  })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedTotalVnd!: number;
}
/** OrderPageQuery: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class OrderPageQuery {
  // Trang bắt đầu từ 1. Kiểm tra: IsInt(), Min(1), Max(1000).
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN,
  )
  @IsInt()
  @Min(1)
  @Max(1000)
  page = 1;
  // Số bản ghi tối đa mỗi trang. Kiểm tra: IsInt(), Min(1), Max(50).
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN,
  )
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}
/** CancelOrderDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class CancelOrderDto {
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(500).
  @ApiProperty({ minLength: 5, maxLength: 500 })
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
/** OrderActionDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class OrderActionDto extends CancelOrderDto {
  // Hành động nghiệp vụ/đích điều hướng thuộc danh sách cho phép.
  @ApiProperty({
    enum: ['CONFIRM', 'SHIP', 'COMPLETE', 'CANCEL'],
    description:
      'COMPLETE requires a receipt/delivery reference in reason; marks COD paid.',
  })
  @IsIn(['CONFIRM', 'SHIP', 'COMPLETE', 'CANCEL'])
  action!: 'CONFIRM' | 'SHIP' | 'COMPLETE' | 'CANCEL';
}

/** DemoPaymentDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class DemoPaymentDto {
  @ApiProperty({ enum: ['DEMO_NO_MONEY'] })
  @IsIn(['DEMO_NO_MONEY'])
  acknowledgement!: 'DEMO_NO_MONEY';
}
