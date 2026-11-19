/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/types.ts
 * Hợp đồng TypeScript của dữ liệu từ backend: Product khác Variant; Page chứa data và meta phân trang.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
/** Kiểu Variant mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface Variant {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Mã SKU duy nhất của phiên bản đồng hồ.
  sku: string;
  // Nhãn hiển thị của lựa chọn/đối tượng.
  label: string;
  // Đơn giá nguyên VND, không dùng số thực để tính tiền.
  priceVnd: number;
  // Cờ khả dụng suy ra từ tồn; không phải giữ chỗ cho khách.
  inStock: boolean;
  // Loại máy: quartz, automatic, mechanical hoặc solar.
  movementType: string;
  // Đường kính mm; có thể null nếu nguồn chỉ cung cấp kích thước khác.
  caseDiameterMm: string | null;
  // Kích thước đầy đủ theo nguồn, phù hợp cả vỏ không tròn.
  caseDimensionsMm: string | null;
  // Tên nguồn giá.
  priceSourceName: string | null;
  // URL nguồn giá để người dùng đối chiếu.
  priceSourceUrl: string | null;
  // Mốc kiểm tra giá tham khảo; không bảo đảm giá còn giống ở nguồn ngoài.
  priceCheckedAt: string | null;
  // Chất liệu vỏ.
  caseMaterial: string;
  // Chất liệu mặt kính.
  crystalMaterial: string;
  // Chất liệu dây.
  strapMaterial: string;
  // Thông số chống nước theo mét do catalog lưu.
  waterResistanceM: number;
  // Số tháng bảo hành; null nghĩa chưa xác định, không tự tạo bảo hành.
  warrantyMonths: number | null;
}
/** Mẫu đồng hồ chứa thông tin chung, tách khỏi SKU. */
export interface Product {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Tên rút gọn duy nhất của mẫu để tra cứu/định danh.
  slug: string;
  // Tên đối tượng dùng để hiển thị.
  name: string;
  // Tên thương hiệu của mẫu.
  brand: string;
  // Nhóm sản phẩm cho bộ lọc.
  category: string;
  // Mô tả được lưu trong catalog.
  description: string;
  // Danh sách URL ảnh; client có thể thử ảnh kế tiếp khi lỗi.
  imageUrls: string[];
  // DEMO là dữ liệu giả, REFERENCE là mẫu thật có nguồn tham khảo.
  dataKind: "DEMO" | "REFERENCE";
  // Tên nguồn thông tin của mẫu.
  sourceName: string | null;
  // URL nguồn thông tin dùng để đối chiếu.
  sourceUrl: string | null;
  // Mốc đã tra cứu nguồn, không phải thời gian cập nhật tự động.
  sourceCheckedAt: string | null;
  // Nguồn xuất xứ ảnh, có thể khác nguồn thông số.
  imageSourceUrl: string | null;
  // Các phiên bản/SKU thuộc một mẫu.
  variants: Variant[];
}
/** Kiểu Page mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface Page<T> {
  // Dữ liệu trả về của API/trang kết quả.
  data: T[];
  // Thông tin phân trang đi cùng data.
  meta: { page: number; limit: number; total: number; totalPages: number };
}
/** Tài khoản và vai trò; không lộ passwordHash ra API. */
export interface User {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Địa chỉ đăng nhập; chuẩn hóa trước khi tra cứu.
  email: string;
  // Tên hiển thị, không phải thông tin phân quyền.
  displayName: string;
  // Vai trò tài khoản; backend kiểm tra quyền từ database.
  role: "CUSTOMER" | "STAFF" | "ADMIN";
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  status: "ACTIVE" | "BLOCKED";
  // Thời điểm tạo bản ghi.
  createdAt: string;
}
/** Kiểu Login mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface Login {
  // Token opaque trả một lần sau login để client gửi Bearer.
  sessionToken: string;
  // Thời điểm hết hiệu lực.
  expiresAt: string;
  // Hồ sơ/danh tính hiện tại; quan hệ DB nếu dùng trong Prisma.
  user: User;
}
/** Kiểu Session mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface Session {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Thời điểm tạo bản ghi.
  createdAt: string;
  // Thời điểm hết hiệu lực.
  expiresAt: string;
  // Cho biết đây có phải phiên đang sử dụng.
  current: boolean;
}
/** Kiểu CartItem mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface CartItem {
  // ID mẫu đồng hồ; một mẫu có thể có nhiều SKU.
  productId: string;
  // ID SKU/phiên bản cụ thể được bán và quản lý tồn riêng.
  variantId: string;
  // Số lượng của dòng hàng; có giới hạn tùy DTO.
  quantity: number;
}

/** Kiểu OrderLine mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface OrderLine {
  // ID SKU/phiên bản cụ thể được bán và quản lý tồn riêng.
  variantId: string;
  // Tên mẫu chụp tại thời điểm tạo đơn hoặc đang hiển thị.
  productName: string;
  // Tên lựa chọn SKU chụp vào dòng đơn.
  variantLabel: string;
  // Mã SKU duy nhất của phiên bản đồng hồ.
  sku: string;
  // Số lượng của dòng hàng; có giới hạn tùy DTO.
  quantity: number;
  // Đơn giá snapshot tại lúc tạo đơn.
  unitPriceVnd: number;
  // Thành tiền của dòng = đơn giá × số lượng.
  lineTotalVnd: number;
  // Số tháng bảo hành; null nghĩa chưa xác định, không tự tạo bảo hành.
  warrantyMonths: number | null;
}
/** Kiểu Quote mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface Quote {
  // Các dòng SKU/số lượng hoặc snapshot đơn.
  items: OrderLine[];
  // Tổng tiền hàng trước giảm giá và phí.
  subtotalVnd: number;
  // Phí giao hàng demo.
  shippingFeeVnd: number;
  // Tổng server tính = tiền hàng − giảm giá + phí.
  totalVnd: number;
  // Số tiền được giảm theo mã hợp lệ.
  discountVnd: number;
  // Mã giảm giá được khách chọn và lưu vào đơn.
  promotionCode: string | null;
  // COD hoặc QR_DEMO; dự án chưa thu tiền thật.
  paymentMethod: "COD" | "QR_DEMO";
  // Chính sách bảo hành chụp vào đơn để đọc lại sau này.
  warrantyPolicy: string;
}

/** Địa chỉ riêng của user phục vụ điền nhanh khi mua. */
export interface SavedAddress {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Nhãn hiển thị của lựa chọn/đối tượng.
  label: string;
  // Tên người nhận hàng.
  recipientName: string;
  // Số điện thoại người nhận.
  phone: string;
  // Địa chỉ nhận hàng.
  address: string;
}
/** Một mẫu yêu thích của một user. */
export interface Favorite {
  // ID mẫu đồng hồ; một mẫu có thể có nhiều SKU.
  productId: string;
  // Tên đối tượng dùng để hiển thị.
  name: string;
  // Tài nguyên hiện còn được phép hiển thị/sử dụng.
  available: boolean;
}
/** Yêu cầu hỗ trợ của user, có thể liên kết đơn/dòng bảo hành. */
export interface SupportTicket {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Tiêu đề ticket.
  subject: string;
  // Loại yêu cầu hỗ trợ.
  kind: string;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  status: string;
  // ID đơn hàng liên quan.
  orderId: string | null;
  // ID dòng hàng trong đơn, dùng cho yêu cầu bảo hành.
  orderItemId: string | null;
  // Thời điểm tạo bản ghi.
  createdAt: string;
  messages: {
    // Định danh bản ghi hoặc request để theo dõi/hủy.
    id: string;
    // Tên tác giả chụp vào tin nhắn hoặc lấy từ hồ sơ.
    authorName: string;
    // Vai trò tác giả phục vụ hiển thị tin nhắn hỗ trợ.
    authorRole: string;
    // Nội dung tin nhắn/đánh giá hoặc JSON request tùy hợp đồng.
    body: string;
    // Thời điểm tạo bản ghi.
    createdAt: string;
  }[];
}
/** Kiểu WarrantyCard mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface WarrantyCard {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // ID đơn hàng liên quan.
  orderId: string;
  // Tên mẫu chụp tại thời điểm tạo đơn hoặc đang hiển thị.
  productName: string;
  // Mã SKU duy nhất của phiên bản đồng hồ.
  sku: string;
  // Số lượng của dòng hàng; có giới hạn tùy DTO.
  quantity: number;
  // Số tháng bảo hành.
  months: number;
  // Thời điểm bắt đầu bảo hành sau hoàn tất đơn.
  activatedAt: string;
  // Thời điểm hết hiệu lực.
  expiresAt: string;
  // Cờ đang hoạt động; ý nghĩa cụ thể tùy đối tượng.
  active: boolean;
  // Serial; demo không tự tạo serial giả.
  serial: null;
}
/** Kiểu Review mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
export interface Review {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // Điểm đánh giá từ 1 đến 5.
  rating: number;
  // Nội dung tin nhắn/đánh giá hoặc JSON request tùy hợp đồng.
  body: string;
  // Tên tác giả chụp vào tin nhắn hoặc lấy từ hồ sơ.
  authorName: string;
  // Dấu hiệu backend xác nhận điều kiện mua hàng.
  verifiedPurchase: boolean;
  // Thời điểm cập nhật, còn dùng làm version để chống ghi đè.
  updatedAt: string;
}
/** Đơn đã lưu snapshot, chủ sở hữu và khóa chống trùng. */
export interface Order extends Quote {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  // ID chủ sở hữu; phía server xác định từ phiên hoặc kiểm tra quyền admin.
  userId: string;
  // Tên người nhận hàng.
  recipientName: string;
  // Số điện thoại người nhận.
  phone: string;
  // Địa chỉ nhận hàng.
  address: string;
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  // Trạng thái thanh toán UNPAID/PAID.
  paymentStatus: "UNPAID" | "PAID";
  // Trạng thái giao vận NOT_SHIPPED/IN_TRANSIT/DELIVERED.
  shippingStatus: "NOT_SHIPPED" | "IN_TRANSIT" | "DELIVERED";
  // Thời điểm tạo bản ghi.
  createdAt: string;
  // Thời điểm cập nhật, còn dùng làm version để chống ghi đè.
  updatedAt: string;
  // Thời điểm lưu trữ đơn; null là còn trong danh sách quản trị đang dùng. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  archivedAt?: string | null;
  // Lịch sử hành động/trạng thái của đơn.
  events: { id: string; action: string; reason: string; createdAt: string }[];
}
