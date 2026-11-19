/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/session.guard.ts
 * Guard dùng chung: bỏ qua route public, tra hash Bearer token, kiểm tra phiên/user rồi kiểm tra role.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '../generated/prisma/client';
import { PUBLIC_KEY, ROLES_KEY } from './auth.decorators';
import { AuthenticatedRequest } from './auth.types';
import { invalidSession } from './auth-transaction';
import { tokenHash } from './tokens';

/** Guard chạy trước controller để quyết định request được phép đi tiếp. */
@Injectable()
export class SessionGuard implements CanActivate {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  /** Kiểm tra metadata public, Bearer token, phiên còn hạn và role; gắn principal đáng tin lên request. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Chỉ nhận đúng định dạng token opaque đã cấp; thiếu/sai token thì request riêng tư bị từ chối.
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
      request.headers.authorization ?? '',
    );
    if (!match) throw invalidSession();
    const session = await this.prisma.userSession.findFirst({
      where: {
        tokenHash: tokenHash(match[1]!),
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: 'ACTIVE' },
      },
      select: { id: true, userId: true, user: { select: { role: true } } },
    });
    if (!session) throw invalidSession();
    // Principal là danh tính lấy từ DB sau xác thực; controller/service dùng nó thay vì userId tự khai trong body.
    request.principal = {
      userId: session.userId,
      sessionId: session.id,
      role: session.user.role,
    };
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Đăng nhập thành công chưa có nghĩa được quản trị: route còn yêu cầu vai trò phù hợp.
    if (roles && !roles.includes(session.user.role))
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện thao tác này.',
      });
    return true;
  }
}
