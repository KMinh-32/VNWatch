/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/users/users.controller.ts
 * API hồ sơ và quản trị user: route cá nhân nhận principal, route quản trị có điều kiện ADMIN.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentSession, Roles } from '../auth/auth.decorators';
import { Principal } from '../auth/auth.types';
import { ApiErrorDto } from '../common/api-error.dto';
import {
  ListUsersDto,
  UpdateAccessDto,
  UpdateProfileDto,
  UserDto,
  UserPageDto,
} from './user.dto';
import {
  AdminCreateUserDto,
  AdminProfileDto,
  AdminReasonDto,
} from './admin-user.dto';
import { UsersService } from './users.service';

/** Controller ánh xạ HTTP → service; decorator class/route là nơi khai báo xác thực và quyền truy cập. */
@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiBadRequestResponse({ type: ApiErrorDto })
@Controller('users')
export class UsersController {
  // NestJS tiêm các dependency được khai báo; private readonly vừa nhận tham số vừa tạo thuộc tính của lớp.
  constructor(private readonly users: UsersService) {}

  /** GET /api/v1/users/me. Đọc hồ sơ của userId lấy từ principal, không dùng userId do khách tự khai. */
  @Get('me')
  @ApiOkResponse({ type: UserDto })
  me(@CurrentSession() principal: Principal) {
    return this.users.findOne(principal, principal.userId);
  }

  /** PATCH /api/v1/users/me. Sửa hồ sơ của chính user theo DTO. */
  @Patch('me')
  @ApiOkResponse({ type: UserDto })
  @ApiOperation({
    summary:
      'Update only your display name. Email, role and status cannot be changed here.',
  })
  updateMe(
    @CurrentSession() principal: Principal,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateMe(principal, dto);
  }

  /** GET /api/v1/users. Liệt kê tài khoản theo bộ lọc dành cho admin. */
  @Roles('ADMIN')
  @Get()
  @ApiOkResponse({ type: UserPageDto })
  @ApiOperation({ summary: 'ADMIN only: paginated user directory.' })
  list(@Query() query: ListUsersDto) {
    return this.users.list(query);
  }

  /** GET /api/v1/users/:id. Đọc tài khoản theo ID; service tiếp tục kiểm tra quyền sở hữu. */
  @Get(':id')
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiOperation({ summary: 'Owner or ADMIN only. Other callers receive 404.' })
  findOne(
    @CurrentSession() principal: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.users.findOne(principal, id);
  }

  /** PATCH /api/v1/users/:id/access. Thay role/status qua nghiệp vụ bảo vệ ADMIN cuối cùng. */
  @Roles('ADMIN')
  @Patch(':id/access')
  @ApiOkResponse({ type: UserDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiOperation({
    summary:
      'ADMIN only: change role/status, revoke target sessions and reset tokens, write audit atomically. Last active ADMIN is protected.',
  })
  updateAccess(
    @CurrentSession() principal: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateAccessDto,
  ) {
    return this.users.updateAccess(principal, id, dto);
  }
  /** POST /api/v1/users. Admin tạo tài khoản với DTO được kiểm tra. */
  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'ADMIN: create an account; server hashes password, role assignment audited.',
  })
  create(@CurrentSession() p: Principal, @Body() d: AdminCreateUserDto) {
    return this.users.create(p, d);
  }
  /** PATCH /api/v1/users/:id. Admin sửa hồ sơ/quyền và ghi lý do. */
  @Patch(':id')
  @Roles('ADMIN')
  edit(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AdminProfileDto,
  ) {
    return this.users.adminProfile(p, id, d);
  }
  /** POST /api/v1/users/:id/revoke-sessions. Admin thu hồi các phiên của tài khoản được chọn. */
  @Post(':id/revoke-sessions')
  @Roles('ADMIN')
  revoke(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AdminReasonDto,
  ) {
    return this.users.adminSessions(p, id, d);
  }
  /** POST /api/v1/users/:id/unlock-login. Admin mở khóa đăng nhập và thu hồi phiên của tài khoản được chọn. */
  @Post(':id/unlock-login')
  @Roles('ADMIN')
  unlock(
    @CurrentSession() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AdminReasonDto,
  ) {
    return this.users.adminSessions(p, id, d, true);
  }
}
