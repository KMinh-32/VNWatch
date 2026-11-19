/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/openapi.ts
 * Tạo tài liệu OpenAPI/Swagger từ controller và DTO để tra cứu và thử API.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Xây đặc tả API từ metadata Swagger của controller/DTO, kèm kiểu Bearer session. */
export function createOpenApi(app: INestApplication) {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('VNWatch Web Services API')
      .setDescription(
        'VNWatch catalog, accounts, cart, orders, coupons, support, reviews and ADMIN management. Use the opaque sessionToken from POST /auth/login or /auth/admin/login in Authorize. Management requires an active ADMIN; CUSTOMER and STAFF retain account-owned shopping. Reference products include provenance; DEMO products and inventory are simulated. COD and QR are demo payment flows, no real funds transfer. Local reset outbox sends no external email. Money is integer VND; timestamps are UTC.',
      )
      .setVersion('0.4.0')
      .addServer('/', 'VNWatch API Gateway hoặc máy chủ API local')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        description: 'Opaque session token (not JWT); expires after 8 hours.',
      })
      .build(),
  );
}

/** Đăng ký giao diện thử API tại đường dẫn docs với cấu hình tài liệu đã tạo. */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('docs', app, createOpenApi(app), {
    jsonDocumentUrl: 'docs-json',
  });
}
