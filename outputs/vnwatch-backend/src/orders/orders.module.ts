/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/orders/orders.module.ts
 * Module orders: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DatabaseModule } from '../database/database.module';

/** NestJS module: decorator bên dưới xác định imports, controllers, providers và dependency được export. */
@Module({
  imports: [DatabaseModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
