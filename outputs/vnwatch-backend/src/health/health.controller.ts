/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/health/health.controller.ts
 * Health check: liveness cho biết tiến trình còn chạy; readiness kiểm tra khả năng truy cập database.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { ApiErrorDto } from '../common/api-error.dto';
import { Public } from '../auth/auth.decorators';

/** HealthDto: hợp đồng dữ liệu. Decorator validation kiểm tra lúc chạy; @ApiProperty mô tả Swagger, không tự xác thực. */
class HealthDto {
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  @ApiProperty({ example: 'ok' }) status!: string;
}

/** Controller ánh xạ HTTP → service; decorator class/route là nơi khai báo xác thực và quyền truy cập. */
@ApiTags('Health (public)')
@Controller('health')
export class HealthController {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly prisma: PrismaService) {}

  /** GET /api/v1/health/live. Trả trạng thái tiến trình, không gọi database. */
  @Get('live')
  @Public()
  @ApiOkResponse({ type: HealthDto })
  live(): HealthDto {
    return { status: 'ok' };
  }

  /** GET /api/v1/health/ready. Thử câu SQL đơn giản; database không sẵn sàng thì health check trả lỗi 503. */
  @Get('ready')
  @Public()
  @ApiOkResponse({ type: HealthDto })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto })
  async ready(): Promise<HealthDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
