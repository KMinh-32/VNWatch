/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/auth-transaction.ts
 * Các hàm bảo vệ thao tác ghi: khóa user rồi kiểm tra lại phiên trong transaction để tránh quyền bị thu hồi giữa chừng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { UnauthorizedException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Principal } from './auth.types';

/** Trả lỗi chung cho sai email/mật khẩu để hạn chế dò tài khoản. */
export function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Không thể đăng nhập bằng thông tin đã cung cấp.',
  });
}
/** Tạo lỗi 401 có code INVALID_SESSION để client xóa phiên và mở lại đăng nhập. */
export function invalidSession(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_SESSION',
    message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  });
}

/** Khóa hàng user bằng FOR UPDATE trong transaction; cùng thứ tự khóa giúp các thao tác quyền/phiên phối hợp. */
export async function lockUser(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  // The adapter selects a schema for ORM queries; qualify raw SQL identically.
  const schema =
    new URL(process.env.DATABASE_URL!).searchParams.get('schema') ?? 'public';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))
    throw new Error('Unsupported database schema identifier');
  await tx.$queryRawUnsafe(
    `SELECT id FROM "${schema}"."users" WHERE id = $1::uuid FOR UPDATE`,
    userId,
  );
}

// Call after acquiring the user lock. Rechecking closes guard-to-write races.
/** Sau khi khóa user, đọc lại phiên chưa thu hồi/còn hạn và user ACTIVE; trả user hiện tại hoặc lỗi 401. */
export async function requireCurrentSession(
  tx: Prisma.TransactionClient,
  principal: Principal,
) {
  const session = await tx.userSession.findFirst({
    where: {
      id: principal.sessionId,
      userId: principal.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { status: 'ACTIVE' },
    },
    include: { user: true },
  });
  if (!session) throw invalidSession();
  return session.user;
}
