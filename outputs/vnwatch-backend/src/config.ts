/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/config.ts
 * Đọc và kiểm tra cấu hình môi trường trước khi chạy; không đặt mật khẩu database trực tiếp trong mã nguồn.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
/** Lấy DATABASE_URL và từ chối cấu hình thiếu để lỗi xuất hiện ngay khi khởi động. */
export function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required');
  const url = new URL(value);
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL');
  }
  return value;
}

/** Chuyển PORT sang số nguyên hợp lệ trong giới hạn cổng TCP. */
export function serverPort(): number {
  const value = process.env.PORT ?? '3000';
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535');
  }
  return Number(value);
}
