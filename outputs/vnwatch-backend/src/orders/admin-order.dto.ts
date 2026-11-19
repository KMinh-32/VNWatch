/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/orders/admin-order.dto.ts
 * DTO admin tạo đơn cho khách, sửa giao nhận và lưu trữ. expectedUpdatedAt phát hiện dữ liệu đã thay đổi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  CreateOrderDto,
  QuoteDto,
  CancelOrderDto,
  OrderPageQuery,
} from './order.dto';
import { trimText } from '../users/user.dto';

/** AdminQuoteDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AdminQuoteDto extends QuoteDto {
  // ID chủ sở hữu; phía server xác định từ phiên hoặc kiểm tra quyền admin. Kiểm tra: IsUUID('4').
  @ApiProperty() @IsUUID('4') userId!: string;
}
/** AdminCreateOrderDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AdminCreateOrderDto extends CreateOrderDto {
  // ID chủ sở hữu; phía server xác định từ phiên hoặc kiểm tra quyền admin. Kiểm tra: IsUUID('4').
  @ApiProperty() @IsUUID('4') userId!: string;
  // Lý do thao tác, được ghi vào lịch sử/audit. Kiểm tra: MinLength(5), MaxLength(500).
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
/** AdminVersionDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AdminVersionDto extends CancelOrderDto {
  // Version client đã đọc; backend từ chối nếu bản ghi hiện tại đã đổi.
  @ApiProperty() @IsDateString() expectedUpdatedAt!: string;
}
/** AdminEditOrderDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AdminEditOrderDto extends PickType(CreateOrderDto, [
  'recipientName',
  'phone',
  'address',
] as const) {
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
/** AdminOrderQuery: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class AdminOrderQuery extends OrderPageQuery {
  // Từ khóa tìm kiếm do user nhập. Dấu ? cho phép thiếu trường trong kiểu TypeScript. Kiểm tra: MaxLength(100).
  @ApiPropertyOptional()
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @Transform(trimText)
  @IsString()
  @MaxLength(100)
  q?: string;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  @ApiPropertyOptional()
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  // Trạng thái thanh toán UNPAID/PAID. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  @ApiPropertyOptional()
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['PAID', 'UNPAID'])
  paymentStatus?: 'PAID' | 'UNPAID';
  // Bộ lọc đơn hiện có/đã lưu trữ/tất cả.
  @ApiPropertyOptional({ default: 'active' })
  @IsIn(['active', 'archived', 'all'])
  archive: 'active' | 'archived' | 'all' = 'active';
}
