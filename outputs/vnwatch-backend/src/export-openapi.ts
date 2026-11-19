/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/export-openapi.ts
 * Xuất đặc tả OpenAPI ra file tài liệu. Đây là script phát triển, không phải endpoint phục vụ khách hàng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { createOpenApi } from './openapi';

/** Điểm chạy script: Xuất đặc tả OpenAPI ra file tài liệu. Đây là script phát triển, không phải endpoint phục vụ khách hàng. Đọc finally để thấy cách giải phóng kết nối/tài nguyên. */
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    configureApp(app);
    await mkdir('docs', { recursive: true });
    await writeFile(
      'docs/openapi.json',
      JSON.stringify(createOpenApi(app), null, 2) + '\n',
    );
  } finally {
    await app.close();
  }
}
void main().catch(() => {
  console.error('OpenAPI export failed. Check configuration.');
  process.exitCode = 1;
});
