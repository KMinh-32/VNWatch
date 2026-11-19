/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/auth.decorators.ts
 * Decorator ghi metadata public và vai trò lên route; SessionGuard sẽ đọc metadata để quyết định quyền truy cập.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { UserRole } from '../generated/prisma/client';
import { AuthenticatedRequest } from './auth.types';

export const PUBLIC_KEY = 'vnwatch.public';
export const ROLES_KEY = 'vnwatch.roles';
/** Gắn metadata để SessionGuard cho phép route không cần Bearer token. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
/** Gắn danh sách vai trò được phép; guard đọc metadata thay vì kiểm tra ở giao diện. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
// Param decorator đọc principal guard đã gắn lên request, không tự kiểm tra hoặc tạo phiên mới.
export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().principal,
);
