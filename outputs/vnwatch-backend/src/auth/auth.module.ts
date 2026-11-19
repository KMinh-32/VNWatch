/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/auth.module.ts
 * Module auth: đăng ký controller/provider và imports/exports để NestJS tiêm dependency đúng phạm vi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionGuard } from './session.guard';
import { AuthRateGuard } from './auth-rate.guard';
import { LocalResetDelivery, ResetDelivery } from './reset-delivery';

/** NestJS module: decorator bên dưới xác định imports, controllers, providers và dependency được export. */
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionGuard,
    AuthRateGuard,
    { provide: ResetDelivery, useClass: LocalResetDelivery },
    { provide: APP_GUARD, useExisting: SessionGuard },
    { provide: APP_GUARD, useExisting: AuthRateGuard },
  ],
})
export class AuthModule {}
