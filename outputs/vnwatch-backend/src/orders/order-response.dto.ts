/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/orders/order-response.dto.ts
 * Mô tả snapshot dòng hàng, lịch sử và JSON đơn trả về; giá trong đơn là giá tại thời điểm tạo.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** OrderItemResponseDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class OrderItemResponseDto {
  // ID SKU/phiên bản cụ thể được bán và quản lý tồn riêng.
  @ApiProperty({ format: 'uuid' }) variantId!: string;
  // Tên mẫu chụp tại thời điểm tạo đơn hoặc đang hiển thị.
  @ApiProperty() productName!: string;
  // Tên lựa chọn SKU chụp vào dòng đơn.
  @ApiProperty() variantLabel!: string;
  // Mã SKU duy nhất của phiên bản đồng hồ.
  @ApiProperty() sku!: string;
  // Số lượng của dòng hàng; có giới hạn tùy DTO.
  @ApiProperty() quantity!: number;
  // Đơn giá snapshot tại lúc tạo đơn.
  @ApiProperty() unitPriceVnd!: number;
  // Thành tiền của dòng = đơn giá × số lượng.
  @ApiProperty() lineTotalVnd!: number;
  // Số tháng bảo hành; null nghĩa chưa xác định, không tự tạo bảo hành.
  @ApiProperty({ type: Number, nullable: true }) warrantyMonths!: number | null;
}
/** QuoteResponseDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class QuoteResponseDto {
  // Các dòng SKU/số lượng hoặc snapshot đơn.
  @ApiProperty({ type: [OrderItemResponseDto] }) items!: OrderItemResponseDto[];
  // Tổng tiền hàng trước giảm giá và phí.
  @ApiProperty() subtotalVnd!: number;
  // Phí giao hàng demo.
  @ApiProperty({ example: 30000 }) shippingFeeVnd!: number;
  // Tổng server tính = tiền hàng − giảm giá + phí.
  @ApiProperty() totalVnd!: number;
  // Số tiền được giảm theo mã hợp lệ.
  @ApiProperty() discountVnd!: number;
  // Mã giảm giá được khách chọn và lưu vào đơn.
  @ApiProperty({ type: String, nullable: true }) promotionCode!: string | null;
  // COD hoặc QR_DEMO; dự án chưa thu tiền thật.
  @ApiProperty({ enum: ['COD', 'QR_DEMO'] }) paymentMethod!: string;
  // Chính sách bảo hành chụp vào đơn để đọc lại sau này.
  @ApiProperty() warrantyPolicy!: string;
}
/** OrderEventResponseDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class OrderEventResponseDto {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  @ApiProperty({ format: 'uuid' }) id!: string;
  // Hành động nghiệp vụ/đích điều hướng thuộc danh sách cho phép.
  @ApiProperty() action!: string;
  // Lý do thao tác, được ghi vào lịch sử/audit.
  @ApiProperty() reason!: string;
  // JSON trạng thái trước thay đổi.
  @ApiProperty({ type: Object }) before!: object;
  // JSON trạng thái sau thay đổi.
  @ApiProperty({ type: Object }) after!: object;
  // Thời điểm tạo bản ghi.
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
/** OrderResponseDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class OrderResponseDto extends QuoteResponseDto {
  // Thời điểm lưu trữ đơn; null là còn trong danh sách quản trị đang dùng. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Only returned to ADMIN. DELETE archives terminal orders; customer history remains.',
  })
  archivedAt?: string | null;
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  @ApiProperty({ format: 'uuid' }) id!: string;
  // ID chủ sở hữu; phía server xác định từ phiên hoặc kiểm tra quyền admin.
  @ApiProperty({ format: 'uuid' }) userId!: string;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] })
  status!: string;
  // Trạng thái thanh toán UNPAID/PAID.
  @ApiProperty({ enum: ['UNPAID', 'PAID'] }) paymentStatus!: string;
  // Trạng thái giao vận NOT_SHIPPED/IN_TRANSIT/DELIVERED.
  @ApiProperty({ enum: ['NOT_SHIPPED', 'IN_TRANSIT', 'DELIVERED'] })
  shippingStatus!: string;
  // Tên người nhận hàng.
  @ApiProperty() recipientName!: string;
  // Số điện thoại người nhận.
  @ApiProperty() phone!: string;
  // Địa chỉ nhận hàng.
  @ApiProperty() address!: string;
  // Thời điểm tạo bản ghi.
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  // Thời điểm cập nhật, còn dùng làm version để chống ghi đè.
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  // Lịch sử hành động/trạng thái của đơn.
  @ApiProperty({ type: [OrderEventResponseDto] })
  events!: OrderEventResponseDto[];
}
/** OrderPageResponseDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class OrderPageResponseDto {
  // Dữ liệu trả về của API/trang kết quả.
  @ApiProperty({ type: [OrderResponseDto] }) data!: OrderResponseDto[];
  // Thông tin phân trang đi cùng data.
  @ApiProperty({ example: { page: 1, limit: 10, total: 1, totalPages: 1 } })
  meta!: object;
}

/** QrDemoResponseDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class QrDemoResponseDto {
  // ID đơn hàng liên quan.
  @ApiProperty({ format: 'uuid' }) orderId!: string;
  // Tổng server tính = tiền hàng − giảm giá + phí.
  @ApiProperty() totalVnd!: number;
  @ApiProperty({ enum: ['VND'] }) currency!: string;
  // Chế độ hội thoại/provider hoặc thao tác giỏ, theo hợp đồng của file.
  @ApiProperty({ enum: ['DEMO'] }) mode!: string;
  @ApiProperty({
    description: 'ASCII non-bank demo text; no bank account or funds transfer.',
  })
  payload!: string;
  @ApiProperty({
    type: 'array',
    items: { type: 'array', items: { type: 'boolean' } },
  })
  modules!: boolean[][];
}
