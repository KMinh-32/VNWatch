/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/api.ts
 * Cầu nối API dùng chung cho web và app Windows: token ở bộ nhớ, timeout/hủy request, JSON lỗi và xử lý phiên hết hạn.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
// Tokens live in memory only. Reloading the page requires signing in again.
let token: string | null = null;
/** Lưu hoặc xóa Bearer token trong biến bộ nhớ của module; tải lại trang sẽ mất token. */
export const setToken = (value: string | null) => {
  token = value;
};
/** Lỗi API có thêm status để UI phân biệt lỗi mạng, validation, phiên và xung đột. */
export class ApiError extends Error {
  // Khởi tạo đối tượng và các giá trị được giữ trong instance; xem tham số public/private để biết thuộc tính tạo ra.
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
/** Hàm generic trả Promise<T>: chọn fetch web hoặc IPC desktop, áp timeout, đọc JSON và phát sự kiện hết phiên khi cần. */
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000);
    const headers = new Headers(options.headers);
    if (options.body) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", "Bearer " + token);
    // App Windows gọi bridge giới hạn thay vì fetch trực tiếp; web dùng cùng giao diện api<T> ở nhánh else.
    if (window.vnwatchDesktop) {
      const desktop = window.vnwatchDesktop;
      // ID theo dõi/hủy IPC khác với Idempotency-Key của đặt hàng; không dùng lẫn hai loại khóa.
      const id = crypto.randomUUID();
      if (signal.aborted) throw signal.reason;
      const result = await new Promise<{ status: number; body: unknown }>(
        (resolve, reject) => {
          /** Hủy đúng request IPC theo id và reject Promise khi AbortSignal đã hủy. */
          const abort = () => {
            desktop.cancelRequest(id);
            reject(signal.reason);
          };
          signal.addEventListener("abort", abort, { once: true });
          desktop
            .request({
              id,
              path,
              method: options.method ?? "GET",
              ...(headers.get("Authorization")
                ? { authorization: headers.get("Authorization")! }
                : {}),
              ...(headers.get("Idempotency-Key")
                ? { idempotencyKey: headers.get("Idempotency-Key")! }
                : {}),
              ...(typeof options.body === "string"
                ? { body: options.body }
                : {}),
            })
            .then(resolve, reject)
            .finally(() => signal.removeEventListener("abort", abort));
        },
      );
      response = new Response(
        // Response 204 không được có body, nên dựng Response với null để giữ đúng hợp đồng fetch.
        result.status === 204 ? null : JSON.stringify(result.body),
        {
          status: result.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    } else {
      response = await fetch(`/api/v1${path}`, { ...options, headers, signal });
    }
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      "Không kết nối được máy chủ. Hãy kiểm tra backend và thử lại.",
      0,
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    // Chỉ sự kiện phiên thực sự không còn hợp lệ mới xóa token; lỗi đăng nhập sai không tự thu hồi phiên khác.
    if (response.status === 401 && token && body?.code === "INVALID_SESSION") {
      token = null;
      window.dispatchEvent(new Event("session-expired"));
    }
    throw new ApiError(
      body?.details?.length
        ? body.details.join(" ")
        : body?.message || "Máy chủ chưa sẵn sàng. Vui lòng thử lại.",
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
/** Wrapper POST: serialize body thành JSON và dùng lại hàm api. */
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
/** Định dạng số VND theo locale vi-VN, không dùng kết quả chuỗi để tính tiền. */
export const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value,
  );
/** Định dạng ngày giờ hiển thị theo múi giờ Việt Nam từ chuỗi thời gian server. */
export const date = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
