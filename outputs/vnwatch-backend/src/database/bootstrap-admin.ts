/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/bootstrap-admin.ts
 * CLI lấy thông tin admin từ đầu vào/môi trường, kiểm tra DTO rồi gọi nghiệp vụ tạo admin đầu tiên.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { databaseUrl } from '../config';
import { RegisterDto } from '../auth/auth.dto';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from './prisma.service';

/** Điểm chạy script: CLI lấy thông tin admin từ đầu vào/môi trường, kiểm tra DTO rồi gọi nghiệp vụ tạo admin đầu tiên. Đọc finally để thấy cách giải phóng kết nối/tài nguyên. */
async function main(): Promise<void> {
  const url = new URL(databaseUrl());
  if (
    process.env.NODE_ENV !== 'development' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !url.pathname.endsWith('_dev')
  )
    throw new Error('Development database required.');
  const dto = plainToInstance(RegisterDto, {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    displayName: process.env.BOOTSTRAP_ADMIN_NAME,
  });
  if ((await validate(dto)).length)
    throw new Error('Valid bootstrap credentials are required.');
  const hash = await new PasswordService().hash(dto.password);
  const prisma = new PrismaService();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 WHERE pg_advisory_xact_lock(87120, 1) IS NULL`;
      if (await tx.user.count({ where: { role: 'ADMIN' } }))
        throw new Error('An admin already exists.');
      const user = await tx.user.create({
        data: {
          email: dto.email,
          displayName: dto.displayName,
          passwordHash: hash,
          role: 'ADMIN',
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: null,
          targetUserId: user.id,
          action: 'ADMIN_BOOTSTRAPPED',
          before: {},
          after: { role: 'ADMIN', status: 'ACTIVE' },
          reason: 'Explicit local development bootstrap',
        },
      });
    });
    console.log(
      'Initial local administrator created. No default password was used.',
    );
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch(() => {
  console.error(
    'Admin bootstrap refused or failed. Requires a local development DB, valid BOOTSTRAP_ADMIN_EMAIL/PASSWORD/NAME and no existing admin.',
  );
  process.exitCode = 1;
});
