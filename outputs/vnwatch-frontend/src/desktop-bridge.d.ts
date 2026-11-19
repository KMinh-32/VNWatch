/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/desktop-bridge.d.ts
 * Khai báo API giới hạn trên window.vnwatchDesktop để TypeScript hiểu cầu nối preload; không cấp quyền Node cho React.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
/** Kiểu DesktopServiceStatus mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
interface DesktopServiceStatus {
  // Nhóm trạng thái dịch vụ hoặc bộ lọc ticket theo hợp đồng tương ứng.
  state: "checking" | "starting" | "ready" | "offline";
  // Thông báo hoặc câu hỏi; giới hạn bằng hợp đồng đầu vào.
  message: string;
  // Origin backend cố định của ứng dụng desktop.
  origin: string;
}
/** Kiểu Window mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
interface Window {
  vnwatchDesktop?: {
    request(input: {
      // Định danh bản ghi hoặc request để theo dõi/hủy.
      id: string;
      // Đường dẫn API tương đối, được bridge kiểm tra trước khi ghép URL.
      path: string;
      // HTTP method thuộc whitelist của bridge. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
      method?: string;
      // Header Bearer đã kiểm tra định dạng. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
      authorization?: string;
      // UUID nhận diện một lần đặt; thử lại cùng nội dung phải nhận cùng đơn. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
      idempotencyKey?: string;
      // Nội dung tin nhắn/đánh giá hoặc JSON request tùy hợp đồng. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
      body?: string;
    }): Promise<{ status: number; body: unknown }>;
    cancelRequest(id: string): void;
    serviceStatus(): Promise<DesktopServiceStatus>;
    startBackend(): Promise<DesktopServiceStatus>;
    openWebsite(): Promise<void>;
  };
}
