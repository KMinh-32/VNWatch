/**
 * HỌC VNWATCH — outputs/vnwatch-backend/src/database/demo-target.ts
 * Nhận diện database/schema demo được phép thao tác bằng các script demo, tránh tác động nhầm dữ liệu khác.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
// The additional target is only the explicitly enabled local Compose database.
/** Chấp nhận đúng database/schema demo theo quy tắc trong hàm; không suy đoán mọi database local đều an toàn. */
export function isDemoDatabase(url: URL): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    return url.pathname.endsWith('_dev');
  return (
    process.env.VNWATCH_DOCKER_DEMO === 'true' &&
    url.hostname === 'db' &&
    url.port === '5432' &&
    url.pathname === '/vnwatch_dev'
  );
}
