/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/first-admin.ts
 * Tạo ADMIN đầu tiên dưới khóa database; từ chối nếu đã có admin hoặc email đã tồn tại, không tự nâng quyền user.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PasswordService } from '../auth/password.service';
import { RegisterDto } from '../auth/auth.dto';

/** Băm mật khẩu, lấy advisory lock dùng chung với thay quyền, từ chối admin/email đã có rồi tạo ADMIN và audit. */
export async function createFirstAdmin(
  prisma: PrismaService,
  passwords: PasswordService,
  dto: RegisterDto,
) {
  const passwordHash = await passwords.hash(dto.password);
  return prisma.$transaction(
    async (tx) => {
      // Same lock as access changes prevents a race with other bootstrap/admin writes.
      await tx.$queryRaw`SELECT 1 WHERE pg_advisory_xact_lock(87120, 1) IS NULL`;
      if (await tx.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }))
        throw new ConflictException(
          'Đã có admin hoạt động. Hãy dùng trang quản trị để tạo thêm tài khoản.',
        );
      if (await tx.user.findUnique({ where: { email: dto.email } }))
        throw new ConflictException(
          'Email đã tồn tại. Không tự động nâng quyền tài khoản có sẵn.',
        );
      const user = await tx.user.create({
        data: {
          email: dto.email,
          displayName: dto.displayName,
          passwordHash,
          role: 'ADMIN',
        },
        select: { id: true },
      });
      await tx.businessAudit.create({
        data: {
          actorId: user.id,
          action: 'ADMIN_BOOTSTRAP',
          targetId: user.id,
          before: {},
          after: { role: 'ADMIN', status: 'ACTIVE' },
          reason: 'Tạo quản trị viên đầu tiên bằng CLI cục bộ',
        },
      });
      return user.id;
    },
    { maxWait: 15000, timeout: 15000 },
  );
}
