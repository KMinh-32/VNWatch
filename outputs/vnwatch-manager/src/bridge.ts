/**
 * HỌC VNWATCH — outputs/vnwatch-manager/src/bridge.ts
 * Xác thực request từ renderer: chỉ backend loopback cố định, whitelist method/header, JSON nhỏ và chặn path traversal.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
/** Hợp đồng request IPC đã giới hạn; mọi trường vẫn phải validation vì renderer là nguồn không tin cậy. */
export interface ApiRequest {
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
}
/** Trạng thái backend mà Electron gửi cho React để bật/tắt thao tác. */
export interface ServiceStatus {
  // Nhóm trạng thái dịch vụ hoặc bộ lọc ticket theo hợp đồng tương ứng.
  state: "checking" | "starting" | "ready" | "offline";
  // Thông báo hoặc câu hỏi; giới hạn bằng hợp đồng đầu vào.
  message: string;
  // Origin backend cố định của ứng dụng desktop.
  origin: string;
}
const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
/** Nhận unknown từ IPC, kiểm tra schema/URL/method/header/body trước khi main được phép fetch. */
export function validateRequest(
  value: unknown,
  origin: string,
): ApiRequest & { url: string } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid request.");
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some(
      (k) =>
        ![
          "id",
          "path",
          "method",
          "authorization",
          "idempotencyKey",
          "body",
        ].includes(k),
    )
  )
    throw new Error("Unsupported request field.");
  if (typeof input.id !== "string" || !/^[a-f0-9-]{36}$/i.test(input.id))
    throw new Error("Invalid request ID.");
  if (
    typeof input.path !== "string" ||
    input.path.length > 4096 ||
    !input.path.startsWith("/") ||
    input.path.startsWith("//") ||
    /[\\\u0000-\u0020#]/.test(input.path)
  )
    throw new Error("Invalid API path.");
  // Ghép path vào origin cố định rồi kiểm tra lại: không cho renderer chuyển request sang website/máy khác.
  const url = new URL("/api/v1" + input.path, origin);
  if (
    url.origin !== origin ||
    !url.pathname.startsWith("/api/v1/") ||
    url.username ||
    url.password
  )
    throw new Error("Invalid API origin.");
  // Decode segments to reject encoded traversal too; queries remain literal URL data.
  // Giải mã path để kiểm tra cả traversal được mã hóa; query vẫn chỉ là dữ liệu URL.
  const decoded = decodeURIComponent(url.pathname);
  if (
    decoded.includes("\\") ||
    decoded.split("/").some((p) => p === ".." || p === ".")
  )
    throw new Error("Invalid API path.");
  const method = input.method ?? "GET";
  if (typeof method !== "string" || !methods.has(method))
    throw new Error("Invalid method.");
  if (
    input.authorization !== undefined &&
    (typeof input.authorization !== "string" ||
      input.authorization.length > 1024 ||
      !/^Bearer [A-Za-z0-9._~-]+$/.test(input.authorization))
  )
    throw new Error("Invalid authorization.");
  if (
    input.idempotencyKey !== undefined &&
    (typeof input.idempotencyKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.idempotencyKey,
      ))
  )
    throw new Error("Invalid idempotency key.");
  if (input.body !== undefined) {
    if (
      method === "GET" ||
      typeof input.body !== "string" ||
      // Giới hạn body theo số byte UTF-8, tối đa 256 KiB; ký tự tiếng Việt có thể nhiều hơn một byte.
      Buffer.byteLength(input.body) > 262144
    )
      throw new Error("Invalid body.");
    JSON.parse(input.body);
  }
  return { ...(input as unknown as ApiRequest), method, url: url.toString() };
}
/** Mặc định localhost:5180; giá trị test chỉ chấp nhận HTTP loopback và cổng không đặc quyền. */
export function backendOrigin(testValue?: string): string {
  if (!testValue) return "http://127.0.0.1:5180";
  const url = new URL(testValue);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !url.port ||
    Number(url.port) < 1024 ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("Test backend must be loopback.");
  return url.origin;
}
