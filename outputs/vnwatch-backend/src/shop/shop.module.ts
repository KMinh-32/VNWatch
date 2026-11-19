/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/shop/shop.module.ts
 * Module shop: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { DatabaseModule } from '../database/database.module';
import { ShopController, ManagementController } from './shop.controller';
import { ShopService } from './shop.service';
/** NestJS module: decorator bên dưới xác định imports, controllers, providers và dependency được export. */
@Module({
  imports: [CatalogModule, DatabaseModule],
  controllers: [ShopController, ManagementController],
  providers: [ShopService],
})
export class ShopModule {}
