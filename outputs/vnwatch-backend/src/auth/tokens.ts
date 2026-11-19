/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/tokens.ts
 * Tạo token ngẫu nhiên và hash SHA-256. Client nhận token gốc; database chỉ giữ hash để tra phiên/reset.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { createHash, randomBytes } from 'node:crypto';

/** Tạo 32 byte ngẫu nhiên mật mã và mã hóa base64url, thành token không chứa thông tin user. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}
/** Băm token bằng SHA-256 để không phải lưu token gốc trong database. */
export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
