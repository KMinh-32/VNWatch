/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/users/users.module.ts
 * Module users: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersController } from './users.controller';
import { PasswordService } from '../auth/password.service';
import { UsersService } from './users.service';

/** NestJS module: decorator bên dưới xác định imports, controllers, providers và dependency được export. */
@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, PasswordService],
})
export class UsersModule {}
