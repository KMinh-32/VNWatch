/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/auth.controller.ts
 * API xác thực. Mỗi route chỉ rõ public/private, giới hạn tần suất và DTO; login quản trị yêu cầu ADMIN.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorDto } from '../common/api-error.dto';
import { UserDto } from '../users/user.dto';
import { AuthService } from './auth.service';
import { CurrentSession, Public } from './auth.decorators';
import { AuthRate } from './auth-rate.guard';
import { Principal } from './auth.types';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ForgotResponseDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  ResetPasswordDto,
  SessionDto,
} from './auth.dto';
import { RESET_MESSAGE } from './auth.constants';

/** Controller ánh xạ HTTP → service; decorator class/route là nơi khai báo xác thực và quyền truy cập. */
@ApiTags('Auth')
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiResponse({
  status: 429,
  type: ApiErrorDto,
  description: 'Rate limited; Retry-After header in seconds.',
})
@Controller('auth')
export class AuthController {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly auth: AuthService) {}

  /** POST /api/v1/auth/register. Nhận RegisterDto đã validation và trả hồ sơ user mới. */
  @Public()
  @Post('register')
  @AuthRate({ name: 'register', limit: 5, seconds: 60 })
  @ApiOperation({
    summary: 'Register as CUSTOMER. Role/status fields are rejected.',
  })
  @ApiCreatedResponse({ type: UserDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** POST /api/v1/auth/login. Đăng nhập khách hàng qua AuthService, trả token và hồ sơ. */
  @Public()
  @Post('login')
  @HttpCode(200)
  @AuthRate({ name: 'login', limit: 20, seconds: 60 })
  @ApiOperation({
    summary:
      'Issue an 8-hour opaque session token. Five failed logins lock the account for 15 minutes.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** POST /api/v1/auth/admin/login. Đăng nhập chỉ cho ADMIN bằng cùng hệ thống phiên, không cấp quyền từ dữ liệu client. */
  @Public()
  @Post('admin/login')
  @HttpCode(200)
  @AuthRate({ name: 'login', limit: 20, seconds: 60 })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiOperation({
    summary:
      'ADMIN only: same password/lockout checks, no session issued for other roles.',
  })
  adminLogin(@Body() dto: LoginDto) {
    return this.auth.login(dto, true);
  }

  /** GET /api/v1/auth/sessions. Lấy principal từ guard và trả các phiên thuộc user. */
  @ApiBearerAuth()
  @Get('sessions')
  @ApiOkResponse({ type: [SessionDto] })
  @ApiOperation({
    summary:
      'List your active sessions; no tokens or token hashes are returned.',
  })
  sessions(@CurrentSession() principal: Principal) {
    return this.auth.sessions(principal);
  }

  /** DELETE /api/v1/auth/sessions/:id. Thu hồi sessionId của user hiện tại, trả response không có body. */
  @ApiBearerAuth()
  @Delete('sessions/:id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({
    summary:
      'Revoke one of your sessions. Other users’ session IDs return 404.',
  })
  revoke(
    @CurrentSession() principal: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.auth.revokeSession(principal, id);
  }

  /** POST /api/v1/auth/logout. Thu hồi phiên đang dùng để Bearer token không còn được chấp nhận. */
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(204)
  @ApiNoContentResponse()
  logout(@CurrentSession() principal: Principal) {
    return this.auth.revokeSession(principal, principal.sessionId);
  }

  /** POST /api/v1/auth/logout-all. Thu hồi tất cả phiên của user. */
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(204)
  @ApiNoContentResponse()
  logoutAll(@CurrentSession() principal: Principal) {
    return this.auth.logoutAll(principal);
  }

  /** POST /api/v1/auth/change-password. Giao mật khẩu cũ/mới đã validation và principal cho service. */
  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(204)
  @ApiNoContentResponse()
  @AuthRate({ name: 'change-password', limit: 5, seconds: 300 })
  @ApiOperation({
    summary:
      'Verify current password; revoke all sessions and reset tokens after change.',
  })
  changePassword(
    @CurrentSession() principal: Principal,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(principal, dto);
  }

  /** POST /api/v1/auth/forgot-password. Luôn trả thông báo chung, tránh tiết lộ email tồn tại hay không. */
  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @ApiAcceptedResponse({ type: ForgotResponseDto })
  @AuthRate({ name: 'forgot-password', limit: 5, seconds: 900, emailLimit: 3 })
  @ApiOperation({
    summary:
      'Generic acknowledgement. Development delivery writes to local outbox; no external email is sent.',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ForgotResponseDto> {
    const start = Date.now();
    await this.auth.forgotPassword(dto.email);
    // Reduce ordinary local-transport timing differences; this is not a constant-time guarantee.
    await new Promise<void>((resolve) =>
      setTimeout(resolve, Math.max(0, 300 - (Date.now() - start))),
    );
    return { message: RESET_MESSAGE };
  }

  /** POST /api/v1/auth/reset-password. Nhận reset token và mật khẩu mới, giao cho service kiểm tra hạn/sử dụng một lần. */
  @Public()
  @Post('reset-password')
  @HttpCode(204)
  @ApiNoContentResponse()
  @AuthRate({ name: 'reset-password', limit: 10, seconds: 60 })
  @ApiOperation({
    summary:
      'Consume a 15-minute reset token once, replace password and revoke all sessions.',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }
}
