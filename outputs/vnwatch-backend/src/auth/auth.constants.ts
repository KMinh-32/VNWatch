/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/auth/auth.constants.ts
 * Tập trung thời hạn phiên/reset và ngưỡng khóa đăng nhập để nghiệp vụ dùng cùng một quy tắc.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const RESET_TTL_MS = 15 * 60 * 1000;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
export const MAX_LOGIN_FAILURES = 5;
export const RESET_MESSAGE =
  'Nếu tài khoản phù hợp tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.';
