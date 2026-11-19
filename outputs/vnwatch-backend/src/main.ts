/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/main.ts
 * Điểm khởi động NestJS: tạo ứng dụng, gắn cấu hình dùng chung, mở HTTP và xử lý lỗi khởi động.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { serverPort } from './config';
import { setupSwagger } from './openapi';

/** Tạo Nest application, cấu hình HTTP/Swagger, bật shutdown hook và lắng nghe host/port đã kiểm tra. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  configureApp(app);
  setupSwagger(app);
  app.enableShutdownHooks();
  await app.listen(serverPort(), process.env.HOST ?? '127.0.0.1');
}

void bootstrap().catch(() => {
  console.error(
    JSON.stringify({
      event: 'startup_failed',
      message: 'Check configuration and database availability.',
    }),
  );
  process.exitCode = 1;
});
