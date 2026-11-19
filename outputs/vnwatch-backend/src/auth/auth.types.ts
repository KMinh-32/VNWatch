/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/auth.types.ts
 * Các kiểu TypeScript cho danh tính đã xác thực và request chứa principal. Kiểu không thay thế kiểm tra lúc chạy.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { Request } from 'express';
import { UserRole } from '../generated/prisma/client';

/** Danh tính từ phiên đã được backend xác thực: userId/sessionId/role. */
export interface Principal {
  // ID chủ sở hữu; phía server xác định từ phiên hoặc kiểm tra quyền admin.
  userId: string;
  // ID phiên đăng nhập đã được guard xác thực.
  sessionId: string;
  // Vai trò tài khoản; backend kiểm tra quyền từ database.
  role: UserRole;
}
/** Request Express bổ sung principal do guard gắn, không lấy danh tính từ body. */
export type AuthenticatedRequest = Request & { principal?: Principal };
