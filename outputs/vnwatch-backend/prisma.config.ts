/**
 * HỌC VNWATCH — outputs/vnwatch-backend/prisma.config.ts
 * Cấu hình CLI Prisma: vị trí schema, migration và URL database đọc từ môi trường.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Generation does not require a live DB. Runtime and migration commands validate their URL.
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://unused:unused@localhost:54329/vnwatch_dev',
  },
});
