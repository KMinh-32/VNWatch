/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/auth-rate.guard.ts
 * Giới hạn request theo cửa sổ thời gian, IP và email bằng bộ đếm database; trả 429 khi vượt ngưỡng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest } from './auth.types';
import { tokenHash } from './tokens';

/** Kiểu RatePolicy mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
interface RatePolicy {
  // Tên đối tượng dùng để hiển thị.
  name: string;
  // Số bản ghi tối đa mỗi trang.
  limit: number;
  seconds: number;
  emailLimit?: number;
}
const RATE_KEY = 'vnwatch.authRate';
/** Gắn chính sách tần suất cho route; AuthRateGuard dùng nó để tăng bộ đếm. */
export const AuthRate = (policy: RatePolicy) => SetMetadata(RATE_KEY, policy);

/** Guard chạy trước controller để quyết định request được phép đi tiếp. */
@Injectable()
export class AuthRateGuard
  implements CanActivate, OnModuleInit, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;
  private readonly logger = new Logger(AuthRateGuard.name);
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}
  /** Dọn bộ đếm hết hạn mỗi phút; unref tránh timer giữ tiến trình sống một mình. */
  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.prisma.authRateBucket
        .deleteMany({ where: { expiresAt: { lt: new Date() } } })
        .catch(() => this.logger.warn({ event: 'auth_rate_cleanup_failed' }));
    }, 60000);
    this.timer.unref();
  }
  /** Hủy timer để không còn tác vụ nền sau khi module dừng. */
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Tăng bộ đếm theo IP/email trong cửa sổ hiện tại; vượt ngưỡng thì trả 429 và Retry-After. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.get<RatePolicy>(
      RATE_KEY,
      context.getHandler(),
    );
    if (!policy) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const windowMs = policy.seconds * 1000;
    const start = Math.floor(Date.now() / windowMs) * windowMs;
    const expiresAt = new Date(start + windowMs);
    const keys = [
      {
        scope: `ip:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`,
        limit: policy.limit,
      },
    ];
    const body = request.body as Record<string, unknown> | undefined;
    if (policy.emailLimit && typeof body?.email === 'string')
      keys.push({
        scope: `email:${body.email.trim().toLowerCase().slice(0, 254)}`,
        limit: policy.emailLimit,
      });
    for (const key of keys) {
      const keyHash = tokenHash(`${policy.name}:${start}:${key.scope}`);
      const bucket = await this.prisma.authRateBucket.upsert({
        where: { keyHash },
        create: { keyHash, hits: 1, expiresAt },
        update: { hits: { increment: 1 } },
      });
      if (bucket.hits > key.limit) {
        response.setHeader(
          'Retry-After',
          Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
        );
        throw new HttpException(
          {
            code: 'RATE_LIMITED',
            message: 'Bạn gửi yêu cầu quá thường xuyên, vui lòng thử lại sau.',
          },
          429,
        );
      }
    }
    return true;
  }
}
