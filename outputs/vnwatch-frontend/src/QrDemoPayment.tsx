/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/QrDemoPayment.tsx
 * Vẽ ma trận QR từ backend và nút mô phỏng thanh toán; QR demo không chuyển tiền qua ngân hàng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useState } from "react";
import { api, money, post } from "./api";
import { Notice } from "./components";
import type { Order } from "./types";
/** Kiểu QrInfo mô tả cấu trúc dữ liệu lúc biên dịch; dữ liệu HTTP/IPC vẫn cần kiểm tra khi chạy. */
type QrInfo = {
  // ID đơn hàng liên quan.
  orderId: string;
  // Tổng server tính = tiền hàng − giảm giá + phí.
  totalVnd: number;
  currency: "VND";
  // Chế độ hội thoại/provider hoặc thao tác giỏ, theo hợp đồng của file.
  mode: "DEMO";
  payload: string;
  modules: boolean[][];
};
/** Tải ma trận QR và vẽ SVG các ô đen/trắng với khoảng trống; hiển thị rõ chế độ demo. */
export function QrDemoPayment({
  order,
  changed,
}: {
  order: Order;
  changed: (order: Order) => void;
}) {
  const [qr, setQr] = useState<QrInfo | null>(null),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState(""),
    // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
    [busy, setBusy] = useState(false),
    // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
    [revision, setRevision] = useState(0);
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setError("");
    setQr(null);
    if (order.paymentStatus === "PAID") return () => controller.abort();
    api<QrInfo>("/orders/" + order.id + "/qr-demo", {
      signal: controller.signal,
    })
      .then(setQr)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [order.id, order.paymentStatus, revision]);
  /** Gọi xác nhận mô phỏng PAID cho đơn, cập nhật trạng thái sau khi backend trả kết quả. */
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      changed(
        await post<Order>("/orders/" + order.id + "/qr-demo/confirm", {
          acknowledgement: "DEMO_NO_MONEY",
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const size = qr?.modules.length ?? 0;
  const pixels =
    qr?.modules
      .flatMap((row, r) =>
        row.flatMap((dark, c) =>
          dark ? ["M" + (c + 4) + " " + (r + 4) + "h1v1h-1z"] : [],
        ),
      )
      .join(" ") ?? "";
  return (
    <section className="qr-payment" aria-label="Thanh toán QR demo">
      <h3>
        {order.paymentStatus === "PAID"
          ? "Đã thanh toán QR demo"
          : "Quét mã QR demo"}
      </h3>
      <Notice>
        Chỉ mô phỏng. Mã này không chứa tài khoản ngân hàng và không dùng để
        chuyển tiền thật. Quét mã không tự xác nhận thanh toán.
      </Notice>
      {error && <Notice error>{error}</Notice>}
      {order.paymentStatus === "PAID" ? (
        <p role="status">
          Hệ thống đã ghi nhận thanh toán mô phỏng cho đơn này. Không có tiền
          thật được thu.
        </p>
      ) : (
        <>
          {!qr && !error && <p role="status">Đang tạo mã QR cho đơn hàng…</p>}
          {!qr && error && (
            <button onClick={() => setRevision((n) => n + 1)}>
              Thử tải lại mã QR
            </button>
          )}
          {qr && (
            <>
              <svg
                className="payment-qr"
                role="img"
                aria-label="Mã QR demo của đơn hàng"
                viewBox={"0 0 " + (size + 8) + " " + (size + 8)}
                shapeRendering="crispEdges"
              >
                <title>Mã QR demo — không chuyển tiền thật</title>
                <rect width="100%" height="100%" fill="#fff" />
                <path d={pixels} fill="#000" />
              </svg>
              <p>
                <strong>{money(qr.totalVnd)}</strong> · DEMO
              </p>
              <p className="small">
                Mã đơn: <span className="order-id">{qr.orderId}</span>
              </p>
              <details>
                <summary>Nội dung mã QR</summary>
                <pre className="qr-payload">{qr.payload}</pre>
              </details>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void confirm()}
              >
                {busy ? "Đang ghi nhận…" : "Mô phỏng thanh toán thành công"}
              </button>
              <p className="small muted">
                Nếu mất phản hồi, bấm lại để lấy trạng thái cùng đơn; không tạo
                thanh toán trùng. Không hỗ trợ hoàn tiền demo sau khi đã xác
                nhận.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
