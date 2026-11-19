/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/AdminOrderTools.tsx
 * Sửa thông tin nhận hàng hoặc lưu trữ/khôi phục đơn với expectedUpdatedAt và lý do thao tác.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import { Notice } from "./components";
import type { Order } from "./types";

/** Form admin sửa giao nhận hoặc lưu trữ/khôi phục theo trạng thái hiện tại của đơn. */
export function AdminOrderTools({
  order,
  changed,
}: {
  order: Order;
  changed: (o: Order) => void;
}) {
  // React state mode: Chế độ của form xác thực/hội thoại. setMode yêu cầu React render lại khi giá trị đổi.
  const [mode, setMode] = useState(""),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState(""),
    // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
    [busy, setBusy] = useState(false);
  const editable =
    !order.archivedAt &&
    ["PENDING", "CONFIRMED"].includes(order.status) &&
    order.shippingStatus === "NOT_SHIPPED";
  const terminal = ["COMPLETED", "CANCELLED"].includes(order.status);
  /** Gửi expectedUpdatedAt và lý do để backend phát hiện đơn đã thay đổi trước khi lưu. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const body = {
        expectedUpdatedAt: order.updatedAt,
        reason: String(data.get("reason")).trim(),
        ...(mode === "edit"
          ? {
              recipientName: data.get("recipientName"),
              phone: data.get("phone"),
              address: data.get("address"),
            }
          : {}),
      };
      const updated = await api<Order>(
        `/orders/${order.id}${mode === "restore" ? "/restore" : ""}`,
        {
          method:
            mode === "edit" ? "PATCH" : mode === "restore" ? "POST" : "DELETE",
          body: JSON.stringify(body),
        },
      );
      setMode("");
      changed(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-order-tools stack">
      {order.archivedAt && (
        <Notice>
          Đơn đã lưu trữ. Khách hàng vẫn xem được lịch sử mua hàng.
        </Notice>
      )}
      <div className="order-actions">
        {editable && (
          <button
            className="outline"
            onClick={() => {
              setMode("edit");
              setError("");
            }}
          >
            Sửa thông tin giao hàng
          </button>
        )}
        {terminal && (
          <button
            className="outline"
            onClick={() => {
              setMode(order.archivedAt ? "restore" : "archive");
              setError("");
            }}
          >
            {order.archivedAt
              ? "Khôi phục đơn hàng"
              : "Xóa khỏi danh sách quản trị"}
          </button>
        )}
      </div>
      {mode && (
        <form
          className="stack action-form"
          onSubmit={submit}
          key={mode + order.updatedAt}
        >
          <h3>
            {mode === "edit"
              ? "Sửa thông tin giao hàng"
              : mode === "restore"
                ? "Khôi phục đơn hàng"
                : "Xác nhận lưu trữ đơn hàng"}
          </h3>
          {error && <Notice error>{error}</Notice>}
          <fieldset disabled={busy} className="stack">
            {mode === "edit" && (
              <>
                <label>
                  Người nhận
                  <input
                    name="recipientName"
                    defaultValue={order.recipientName}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Số điện thoại
                  <input
                    name="phone"
                    defaultValue={order.phone}
                    pattern="(0[0-9]{9}|\\+84[0-9]{9})"
                    required
                  />
                </label>
                <label>
                  Địa chỉ nhận hàng
                  <textarea
                    name="address"
                    defaultValue={order.address}
                    minLength={10}
                    maxLength={500}
                    required
                  />
                </label>
                <p className="small muted">
                  Giá, sản phẩm và tổng tiền của đơn được giữ nguyên.
                </p>
              </>
            )}
            {mode === "archive" && (
              <p>
                Đơn đã kết thúc sẽ được ẩn khỏi danh sách quản trị mặc định.
                Lịch sử, doanh thu và bảo hành vẫn được giữ; có thể khôi phục
                trong mục Đã lưu trữ.
              </p>
            )}
            <label>
              Lý do thay đổi
              <textarea name="reason" required minLength={5} maxLength={500} />
            </label>
            <div className="order-actions">
              <button className="primary">
                {busy ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
              <button
                type="button"
                className="outline"
                onClick={() => setMode("")}
              >
                Quay lại
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
