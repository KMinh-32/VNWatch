/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/common/api-error.dto.ts
 * Mô tả cấu trúc lỗi API thống nhất để client đọc mã lỗi, thông báo, chi tiết và requestId.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ApiProperty } from '@nestjs/swagger';

/** ApiErrorDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ApiErrorDto {
  // HTTP status trong cấu trúc lỗi.
  @ApiProperty({ example: 400 }) statusCode!: number;
  // Mã lỗi hoặc mã khuyến mãi tùy DTO/model.
  @ApiProperty({ example: 'VALIDATION_ERROR' }) code!: string;
  // Thông báo hoặc câu hỏi; giới hạn bằng hợp đồng đầu vào.
  @ApiProperty({ example: 'Dữ liệu gửi lên không hợp lệ.' }) message!: string;
  // Danh sách chi tiết lỗi validation.
  @ApiProperty({ type: [String], example: ['limit phải từ 1 đến 50.'] })
  details!: string[];
  // Mã theo dõi nối response với log server.
  @ApiProperty({ format: 'uuid' }) requestId!: string;
}
