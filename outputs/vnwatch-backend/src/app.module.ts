/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/app.module.ts
 * Module app: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Module } from '@nestjs/common';
import { ApiIndexController } from './api-index.controller';
import { CatalogModule } from './catalog/catalog.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { AssistantModule } from './assistant/assistant.module';
import { ShopModule } from './shop/shop.module';

/** NestJS module: decorator bên dưới xác định imports, controllers, providers và dependency được export. */
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    OrdersModule,
    AssistantModule,
    ShopModule,
  ],
  controllers: [HealthController, ApiIndexController],
})
export class AppModule {}
