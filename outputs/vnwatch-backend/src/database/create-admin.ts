/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/create-admin.ts
 * Script cục bộ tạo tài khoản admin cho demo với mật khẩu đã được băm; không chạy tự động trên mỗi request.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from '../auth/auth.dto';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from './prisma.service';
import { createFirstAdmin } from './first-admin';
import { databaseUrl } from '../config';
import { isDemoDatabase } from './demo-target';

/** Điểm chạy script: Script cục bộ tạo tài khoản admin cho demo với mật khẩu đã được băm; không chạy tự động trên mỗi request. Đọc finally để thấy cách giải phóng kết nối/tài nguyên. */
async function main() {
  if (!isDemoDatabase(new URL(databaseUrl())))
    throw new Error('Dữ liệu phải thuộc database demo cục bộ đã cấu hình.');
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > 8192) throw new Error('Dữ liệu nhập quá dài.');
    chunks.push(Buffer.from(chunk));
  }
  let body: unknown;
  try {
    body = JSON.parse(
      Buffer.concat(chunks)
        .toString('utf8')
        .replace(/^\uFEFF/, ''),
    );
  } catch {
    throw new Error('Dữ liệu đầu vào không hợp lệ.');
  }
  const dto = plainToInstance(RegisterDto, body);
  if (
    (await validate(dto, { whitelist: true, forbidNonWhitelisted: true }))
      .length
  )
    throw new Error('Kiểm tra email, tên 2–80 ký tự và mật khẩu 15–128 ký tự.');
  const prisma = new PrismaService();
  try {
    await createFirstAdmin(prisma, new PasswordService(), dto);
    console.log(
      'Đã tạo admin đầu tiên. Đăng nhập tại http://127.0.0.1:5180/admin bằng thông tin vừa nhập.',
    );
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch((error) => {
  console.error(
    error instanceof Error &&
      (error.message.startsWith('Đã có admin') ||
        error.message.startsWith('Email đã') ||
        error.message.startsWith('Kiểm tra') ||
        error.message.startsWith('Dữ liệu'))
      ? error.message
      : 'Không thể tạo admin. Kiểm tra Docker, migrations và kết nối cơ sở dữ liệu.',
  );
  process.exitCode = 1;
});
