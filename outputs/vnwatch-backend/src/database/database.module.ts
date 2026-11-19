/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/database.module.ts
 * Module database: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** NestJS module: decorator bên dưới xác định imports, controllers, providers và dependency được export. */
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class DatabaseModule {}
