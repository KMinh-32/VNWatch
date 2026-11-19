/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/common/api-exception.filter.ts
 * Chuyển exception thành JSON lỗi thống nhất; log lỗi server có mã theo dõi nhưng không trả stack trace cho khách.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  /** Lấy HTTP status nếu là lỗi nghiệp vụ, chọn thông báo an toàn và gắn requestId vào JSON phản hồi. */
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;
    const body =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : {};
    const fallback: Record<number, [string, string]> = {
      400: ['VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.'],
      401: ['UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này.'],
      403: ['FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'],
      409: ['CONFLICT', 'Yêu cầu xung đột với trạng thái hiện tại.'],
      429: [
        'RATE_LIMITED',
        'Bạn gửi yêu cầu quá thường xuyên, vui lòng thử lại sau.',
      ],
      404: ['NOT_FOUND', 'Không tìm thấy tài nguyên.'],
      503: ['DATABASE_UNAVAILABLE', 'Cơ sở dữ liệu tạm thời không sẵn sàng.'],
    };
    const [defaultCode, defaultMessage] = fallback[status] ?? [
      'INTERNAL_ERROR',
      'Hệ thống gặp lỗi, vui lòng thử lại sau.',
    ];
    if (status >= 500) {
      const errorCode =
        typeof exception === 'object' &&
        exception !== null &&
        'code' in exception
          ? String((exception as { code?: unknown }).code)
          : undefined;
      this.logger.error({
        event: 'request_failed',
        requestId: response.locals.requestId,
        errorType: exception instanceof Error ? exception.name : 'UnknownError',
        ...(errorCode ? { errorCode } : {}),
      });
    }
    response.status(status).json({
      statusCode: status,
      code: typeof body.code === 'string' ? body.code : defaultCode,
      message:
        typeof body.code === 'string' && typeof body.message === 'string'
          ? body.message
          : defaultMessage,
      details: Array.isArray(body.details) ? body.details : [],
      requestId: response.locals.requestId,
    });
  }
}
