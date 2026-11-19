/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/configure-app.ts
 * Cấu hình áp dụng cho mọi request: header bảo mật, mã theo dõi, tiền tố API, kiểm tra DTO và định dạng lỗi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'class-validator';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/api-exception.filter';

/** Gom lỗi validation lồng nhau thành danh sách dễ đọc; thông báo trường thừa được Việt hóa. */
function messages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...(error.constraints
      ? Object.values(error.constraints).map((message) =>
          message.startsWith('property ')
            ? `Tham số ${error.property} không được hỗ trợ.`
            : message,
        )
      : []),
    ...messages(error.children ?? []),
  ]);
}

/** Đăng ký middleware, ValidationPipe và exception filter trước khi nhận request. */
export function configureApp(app: INestApplication): void {
  const logger = new Logger('HTTP');
  // Helmet bổ sung header HTTP bảo mật; đây là bảo vệ response, không phải cơ chế xác thực user.
  app.use(helmet());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const started = performance.now();
    // Mỗi request có ID riêng; tra ID trong log khi UI nhận lỗi để biết request nào gặp sự cố.
    const requestId = randomUUID();
    response.locals.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);
    if (
      /^\/api\/v1\/(auth|users|orders|assistant|shop|management)(\/|$)/.test(
        request.path,
      )
    ) {
      // Không cache dữ liệu phiên/tài khoản/đơn để thông tin riêng không xuất hiện từ bản cache cũ.
      response.setHeader('Cache-Control', 'no-store');
    }
    response.on('finish', () =>
      logger.log({
        event: 'http_request',
        requestId,
        method: request.method,
        route:
          (request.route as { path?: string } | undefined)?.path ?? 'unmatched',
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
    next();
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      // Chuyển plain JSON/query thành instance DTO để @Transform và validation hoạt động theo cấu hình.
      transform: true,
      // Chỉ giữ thuộc tính có decorator validation; forbidNonWhitelisted bên dưới còn từ chối trường lạ.
      whitelist: true,
      forbidNonWhitelisted: true,
      // Không đính kèm toàn bộ object/giá trị đầu vào vào lỗi validation, đặc biệt dữ liệu nhạy cảm.
      validationError: { target: false, value: false },
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu gửi lên không hợp lệ.',
          details: messages(errors),
        }),
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}
