/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/adminNavigation.ts
 * Kiểu route/filter của quản trị để các ô thống kê và menu chuyển đúng màn hình bằng một hợp đồng chung.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
/** Tên mục quản trị thuộc danh sách cho phép. */
export type AdminSection =
  | "reports"
  | "products"
  | "orders"
  | "users"
  | "promotions"
  | "support"
  | "reviews"
  | "audit";

/** Kiểu callback chuyển mục quản trị và truyền bộ lọc. */
export type AdminNavigate = (
  section: AdminSection,
  params?: Record<string, string>,
) => void;
