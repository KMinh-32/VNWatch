/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/catalog/dto/product-response.dto.ts
 * Các lớp mô tả JSON trả về của mẫu, SKU và trang kết quả; đồng thời dùng để tạo tài liệu Swagger.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ApiProperty } from '@nestjs/swagger';

/** ProductVariantDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ProductVariantDto {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  @ApiProperty({ format: 'uuid' }) id!: string;
  // Mã SKU duy nhất của phiên bản đồng hồ.
  @ApiProperty({ example: 'DEMO-EVERYDAY-BLACK' }) sku!: string;
  // Nhãn hiển thị của lựa chọn/đối tượng.
  @ApiProperty({ example: 'Black / 38 mm' }) label!: string;
  // Đơn giá nguyên VND, không dùng số thực để tính tiền.
  @ApiProperty({
    example: 1500000,
    description: 'Integer VND; not a checkout price guarantee.',
  })
  priceVnd!: number;
  // Cờ khả dụng suy ra từ tồn; không phải giữ chỗ cho khách.
  @ApiProperty({
    example: true,
    description: 'Advisory availability; checkout must recheck the database.',
  })
  inStock!: boolean;
  // Loại máy: quartz, automatic, mechanical hoặc solar.
  @ApiProperty({ enum: ['QUARTZ', 'AUTOMATIC', 'MECHANICAL', 'SOLAR'] })
  movementType!: string;
  // Đường kính mm; có thể null nếu nguồn chỉ cung cấp kích thước khác.
  @ApiProperty({
    type: String,
    nullable: true,
    example: '38.00',
    description: 'Round case diameter; null for non-round cases.',
  })
  caseDiameterMm!: string | null;
  // Kích thước đầy đủ theo nguồn, phù hợp cả vỏ không tròn.
  @ApiProperty({
    type: String,
    nullable: true,
    example: '45 × 42.1 × 12.5 mm (dài × rộng × dày)',
  })
  caseDimensionsMm!: string | null;
  // Tên nguồn giá.
  @ApiProperty({ type: String, nullable: true }) priceSourceName!:
    string | null;
  // URL nguồn giá để người dùng đối chiếu.
  @ApiProperty({ type: String, nullable: true }) priceSourceUrl!: string | null;
  // Mốc kiểm tra giá tham khảo; không bảo đảm giá còn giống ở nguồn ngoài.
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  priceCheckedAt!: string | null;
  // Chất liệu vỏ.
  @ApiProperty({ example: 'Demo stainless steel' }) caseMaterial!: string;
  // Chất liệu mặt kính.
  @ApiProperty({ example: 'Demo mineral glass' }) crystalMaterial!: string;
  // Chất liệu dây.
  @ApiProperty({ example: 'Demo leather' }) strapMaterial!: string;
  // Thông số chống nước theo mét do catalog lưu.
  @ApiProperty({ example: 30 }) waterResistanceM!: number;
  // Số tháng bảo hành; null nghĩa chưa xác định, không tự tạo bảo hành.
  @ApiProperty({
    example: 12,
    type: Number,
    nullable: true,
    description:
      'VNWatch policy; null when not configured. External seller policies are not imported.',
  })
  warrantyMonths!: number | null;
}

/** ProductDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ProductDto {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  @ApiProperty({ format: 'uuid' }) id!: string;
  // Tên rút gọn duy nhất của mẫu để tra cứu/định danh.
  @ApiProperty({ example: 'demo-everyday' }) slug!: string;
  // Tên đối tượng dùng để hiển thị.
  @ApiProperty({ example: 'DEMO Everyday' }) name!: string;
  // Tên thương hiệu của mẫu.
  @ApiProperty({ example: 'VNWatch Demo (fictional)' }) brand!: string;
  // Nhóm sản phẩm cho bộ lọc.
  @ApiProperty({ example: 'dress' }) category!: string;
  // Mô tả được lưu trong catalog.
  @ApiProperty({
    example: 'Dữ liệu demo, không phải sản phẩm kinh doanh thật.',
  })
  description!: string;
  // Danh sách URL ảnh; client có thể thử ảnh kế tiếp khi lỗi.
  @ApiProperty({ type: [String], example: [] }) imageUrls!: string[];
  // DEMO là dữ liệu giả, REFERENCE là mẫu thật có nguồn tham khảo.
  @ApiProperty({ enum: ['DEMO', 'REFERENCE'] }) dataKind!: string;
  // Tên nguồn thông tin của mẫu.
  @ApiProperty({ type: String, nullable: true }) sourceName!: string | null;
  // URL nguồn thông tin dùng để đối chiếu.
  @ApiProperty({ type: String, nullable: true }) sourceUrl!: string | null;
  // Mốc đã tra cứu nguồn, không phải thời gian cập nhật tự động.
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  sourceCheckedAt!: string | null;
  // Nguồn xuất xứ ảnh, có thể khác nguồn thông số.
  @ApiProperty({ type: String, nullable: true }) imageSourceUrl!: string | null;
  // Các phiên bản/SKU thuộc một mẫu.
  @ApiProperty({ type: [ProductVariantDto] }) variants!: ProductVariantDto[];
  // Thời điểm tạo bản ghi.
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

/** PaginationDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class PaginationDto {
  // Trang bắt đầu từ 1.
  @ApiProperty({ example: 1 }) page!: number;
  // Số bản ghi tối đa mỗi trang.
  @ApiProperty({ example: 20 }) limit!: number;
  // Tổng số bản ghi khớp điều kiện.
  @ApiProperty({ example: 2 }) total!: number;
  // Số trang = ceil(total/limit).
  @ApiProperty({ example: 1 }) totalPages!: number;
}

/** ProductPageDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
export class ProductPageDto {
  // Dữ liệu trả về của API/trang kết quả.
  @ApiProperty({ type: [ProductDto] }) data!: ProductDto[];
  // Thông tin phân trang đi cùng data.
  @ApiProperty({ type: PaginationDto }) meta!: PaginationDto;
}
