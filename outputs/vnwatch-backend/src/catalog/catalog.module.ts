/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/catalog/catalog.module.ts
 * Module catalog: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogRepository } from './catalog.repository';

/** NestJS module: decorator bên dưới xác định imports, controllers, providers và dependency được export. */
@Module({
  imports: [DatabaseModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
  exports: [CatalogService],
})
export class CatalogModule {}
