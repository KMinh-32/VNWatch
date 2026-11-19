/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/users/user-mapping.ts
 * Chọn và ánh xạ trường user được phép trả ra; passwordHash và dữ liệu đăng nhập nội bộ không đi ra client.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Prisma } from '../generated/prisma/client';
import { UserDto } from './user.dto';

export const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
/** Chỉ ánh xạ các trường hồ sơ công khai, ngày tháng dùng ISO để client tự định dạng. */
export function toUserDto(
  user: Prisma.UserGetPayload<{ select: typeof publicUserSelect }>,
): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
