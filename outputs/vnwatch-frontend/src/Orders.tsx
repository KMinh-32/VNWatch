/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/Orders.tsx
 * Thanh toán, đơn cá nhân và quản trị. Lưu yêu cầu đang chờ vào sessionStorage để thử lại cùng key khi mất phản hồi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError, date, money, post } from "./api";
import { AdminPanel, Modal, Notice } from "./components";
import { AdminOrderTools } from "./AdminOrderTools";
import { AdminCreateOrder } from "./AdminCreateOrder";
import { QrDemoPayment } from "./QrDemoPayment";
import type { CartItem, Order, Page, Quote, User, SavedAddress } from "./types";

/** JSON đầu vào thao tác đặt hàng; giá thật vẫn được backend đọc và tính lại. */
type Body = {
  // Các dòng SKU/số lượng hoặc snapshot đơn.
  items: { variantId: string; quantity: number }[];
  // Tên người nhận hàng.
  recipientName: string;
  // Số điện thoại người nhận.
  phone: string;
  // Địa chỉ nhận hàng.
  address: string;
  // Tổng khách đã xem; server đối chiếu lại để phát hiện giá thay đổi.
  expectedTotalVnd: number;
  // Mã giảm giá được khách chọn và lưu vào đơn. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  promotionCode?: string;
  // COD hoặc QR_DEMO; dự án chưa thu tiền thật. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  paymentMethod?: "COD" | "QR_DEMO";
};
/** Yêu cầu đặt chưa rõ kết quả: giữ key, body và quote để retry không tạo đơn trùng. */
interface Pending {
  // Khóa duy nhất theo ngữ cảnh; pending order dùng key chống tạo trùng.
  key: string;
  // Nội dung tin nhắn/đánh giá hoặc JSON request tùy hợp đồng.
  body: Body;
  // Báo giá từ backend, chưa phải đơn đã tạo.
  quote: Quote;
}
/** Tạo khóa sessionStorage riêng theo userId để các tài khoản không dùng nhầm request đang chờ. */
const pendingKey = (userId: string) => `vnwatch.pending-order.${userId}`;
/** Đọc JSON request đang chờ và kiểm tra cấu trúc tối thiểu; dữ liệu thiếu/sai trả null. */
function readPending(userId: string): Pending | null {
  try {
    const data: unknown = JSON.parse(
      sessionStorage.getItem(pendingKey(userId)) ?? "null",
    );
    if (!data || typeof data !== "object") return null;
    const p = data as Pending;
    if (
      typeof p.key !== "string" ||
      !p.body ||
      !Array.isArray(p.body.items) ||
      !p.quote ||
      !Array.isArray(p.quote.items) ||
      !Number.isSafeInteger(p.quote.totalVnd)
    )
      return null;
    return p;
  } catch {
    return null;
  }
}
/** Cho biết user có request chưa được xác nhận kết quả để UI ưu tiên phục hồi. */
export const hasPendingOrder = (userId: string) => readPending(userId) !== null;
/** Xóa request đang chờ khi đã nhận kết quả chắc chắn; không làm hỏng UI nếu storage không truy cập được. */
function clearPending(userId: string) {
  try {
    sessionStorage.removeItem(pendingKey(userId));
  } catch {
    /* No persistent storage. */
  }
}
export const orderStatus = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};
const shippingStatus = {
  NOT_SHIPPED: "Chưa giao",
  IN_TRANSIT: "Đang giao",
  DELIVERED: "Đã giao",
};

/** Hiển thị dòng hàng, giảm giá, phí và tổng theo báo giá server. */
function Summary({ quote }: { quote: Quote }) {
  return (
    <div className="order-summary">
      <h3>Chi tiết thanh toán</h3>
      {quote.items.map((item) => (
        <div className="summary-line" key={item.variantId}>
          <div>
            <strong>{item.productName}</strong>
            <p className="muted small">
              {item.variantLabel} × {item.quantity}
            </p>
          </div>
          <span>{money(item.lineTotalVnd)}</span>
        </div>
      ))}
      <div className="summary-line">
        <span>Tiền sản phẩm</span>
        <span>{money(quote.subtotalVnd)}</span>
      </div>
      <div className="summary-line">
        <span>Phí giao hàng demo</span>
        <span>{money(quote.shippingFeeVnd)}</span>
      </div>
      {quote.discountVnd > 0 && (
        <div className="summary-line">
          <span>Giảm giá · {quote.promotionCode}</span>
          <span>−{money(quote.discountVnd)}</span>
        </div>
      )}
      <div className="cart-total">
        <span>Tổng thanh toán</span>
        <strong>{money(quote.totalVnd)}</strong>
      </div>
      <p className="muted small">
        {quote.paymentMethod === "QR_DEMO"
          ? "QR demo trên website — không chuyển tiền thật."
          : "Thanh toán khi nhận hàng (COD). Chưa thu tiền khi tạo đơn."}
      </p>
    </div>
  );
}

/** Lấy báo giá khi giỏ/phương thức/mã thay đổi; giữ key/body trước khi gửi để thử lại an toàn. */
export function Checkout({
  items,
  user,
  close,
  placed,
}: {
  // Các dòng SKU/số lượng hoặc snapshot đơn.
  items: CartItem[];
  // Hồ sơ/danh tính hiện tại; quan hệ DB nếu dùng trong Prisma.
  user: User;
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  // Callback báo đơn đã được server tạo thành công.
  placed: (order: Order) => void;
}) {
  // React state pending: Request chưa rõ kết quả; giữ cùng key/body khi thử lại. setPending yêu cầu React render lại khi giá trị đổi.
  const [pending, setPending] = useState<Pending | null>(() =>
    readPending(user.id),
  );
  // React state quote: Báo giá server hiện tại, cần lấy lại khi thông tin ảnh hưởng giá đổi. setQuote yêu cầu React render lại khi giá trị đổi.
  const [quote, setQuote] = useState<Quote | null>(
    () => readPending(user.id)?.quote ?? null,
  );
  // React state paymentMethod: Phương thức được chọn COD/QR_DEMO. setPaymentMethod yêu cầu React render lại khi giá trị đổi.
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "QR_DEMO">(
    pending?.body.paymentMethod ?? "COD",
  );
  // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
  const [busy, setBusy] = useState(false);
  // React state loading: Đang tải dữ liệu để hiển thị skeleton/thông báo. setLoading yêu cầu React render lại khi giá trị đổi.
  const [loading, setLoading] = useState(!pending);
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
  const [revision, setRevision] = useState(0);
  // React state addresses: Địa chỉ riêng của tài khoản dùng để chọn nhanh. setAddresses yêu cầu React render lại khi giá trị đổi.
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressError, setAddressError] = useState("");
  // React state promotionInput: Mã user đang nhập, tách khỏi mã đã áp dụng. setPromotionInput yêu cầu React render lại khi giá trị đổi.
  const [promotionInput, setPromotionInput] = useState(
    pending?.body.promotionCode ?? "",
  );
  // React state appliedPromotion: Mã đã áp dụng để backend tính báo giá. setAppliedPromotion yêu cầu React render lại khi giá trị đổi.
  const [appliedPromotion, setAppliedPromotion] = useState(
    pending?.body.promotionCode ?? "",
  );
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController. Mảng []: chạy khi mount, cleanup khi unmount.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    api<SavedAddress[]>("/shop/addresses", { signal: controller.signal })
      .then(setAddresses)
      .catch((e) => {
        if (!controller.signal.aborted) setAddressError(e.message);
      });
    return () => controller.abort();
  }, []);
  // React state draft: Dữ liệu form chưa gửi; chưa phải bản ghi đã lưu. setDraft yêu cầu React render lại khi giá trị đổi.
  const [draft, setDraft] = useState(() =>
    pending
      ? {
          recipientName: pending.body.recipientName,
          phone: pending.body.phone,
          address: pending.body.address,
        }
      : { recipientName: user.displayName, phone: "", address: "" },
  );
  const lines = JSON.stringify(
    items
      .map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
      .sort((a, b) => a.variantId.localeCompare(b.variantId)),
  );
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    // Khi còn request chưa rõ kết quả, không thay quote/body; retry phải gửi đúng nội dung lần trước.
    if (pending) return;
    if (!items.length) {
      setLoading(false);
      setQuote(null);
      return;
    }
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setQuote(null);
    api<Quote>("/orders/quote", {
      method: "POST",
      body: JSON.stringify({
        items: JSON.parse(lines),
        paymentMethod,
        ...(appliedPromotion ? { promotionCode: appliedPromotion } : {}),
      }),
      signal: controller.signal,
    })
      .then(setQuote)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [lines, revision, pending, items.length, appliedPromotion, paymentMethod]);
  /** Ngăn form mặc định, gửi thao tác đơn và xử lý trạng thái đang chờ/lỗi để không gửi hai lần. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!quote || busy || loading || quote.paymentMethod !== paymentMethod)
      return;
    setError("");
    setBusy(true);
    const request: Pending = pending ?? {
      key: crypto.randomUUID(),
      quote,
      body: {
        items: JSON.parse(lines),
        recipientName: draft.recipientName.trim(),
        phone: draft.phone.trim(),
        address: draft.address.trim(),
        expectedTotalVnd: quote.totalVnd,
        paymentMethod: quote.paymentMethod,
        ...(quote.promotionCode ? { promotionCode: quote.promotionCode } : {}),
      },
    };
    try {
      // Persist BEFORE sending: a lost response or page reload must retain the same request key/body.
      // Lưu trước khi POST: mạng có thể mất phản hồi sau khi server đã tạo đơn, key/body còn để nhận lại đơn đó.
      sessionStorage.setItem(pendingKey(user.id), JSON.stringify(request));
    } catch {
      setError(
        "Trình duyệt không lưu được yêu cầu an toàn. Hãy cho phép lưu trữ theo phiên rồi thử lại.",
      );
      setBusy(false);
      return;
    }
    setPending(request);
    try {
      const result = await api<Order>("/orders", {
        method: "POST",
        // Giữ nguyên UUID khi retry cùng request; server so hash body và trả đơn đã tạo nếu có.
        headers: { "Idempotency-Key": request.key },
        body: JSON.stringify(request.body),
      });
      clearPending(user.id);
      placed(result);
    } catch (e) {
      // 400/409 là từ chối chắc chắn theo API hiện tại; lỗi mạng/timeout giữ pending vì chưa biết server đã tạo đơn chưa.
      if (e instanceof ApiError && [400, 409].includes(e.status)) {
        // A definitive validation/stock/price rejection means no order was created by this attempt.
        clearPending(user.id);
        setPending(null);
        setRevision((n) => n + 1);
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        paymentMethod === "QR_DEMO"
          ? "Đặt hàng và thanh toán QR demo"
          : "Đặt hàng COD"
      }
      close={() => {
        if (!busy) close();
      }}
      wide
    >
      <p className="muted small">
        Đơn demo được lưu vào hệ thống. Không giao hàng hoặc thu tiền thật.
      </p>
      {pending && (
        <Notice>
          Yêu cầu trước chưa được xác nhận trên trình duyệt. Bấm xác nhận lại để
          nhận kết quả cùng đơn; thông tin được giữ nguyên để tránh tạo trùng.
        </Notice>
      )}
      {error && <Notice error>{error}</Notice>}
      <fieldset className="payment-methods" disabled={busy || !!pending}>
        <legend>Phương thức thanh toán</legend>
        <label>
          <input
            type="radio"
            name="payment-method"
            value="COD"
            checked={paymentMethod === "COD"}
            onChange={() => setPaymentMethod("COD")}
          />{" "}
          Thanh toán khi nhận hàng (COD)
        </label>
        <label>
          <input
            type="radio"
            name="payment-method"
            value="QR_DEMO"
            checked={paymentMethod === "QR_DEMO"}
            onChange={() => setPaymentMethod("QR_DEMO")}
          />{" "}
          Mã QR demo trên website
        </label>
        {paymentMethod === "QR_DEMO" && (
          <p className="muted small">
            QR không chứa tài khoản ngân hàng. Sau khi tạo đơn, bạn xem mã và mô
            phỏng thanh toán ngay tại đây.
          </p>
        )}
      </fieldset>
      <div className="coupon-control">
        <label>
          Mã giảm giá
          <input
            value={promotionInput}
            maxLength={32}
            disabled={busy || !!pending}
            onChange={(e) => setPromotionInput(e.target.value.toUpperCase())}
            placeholder="Nhập mã nếu có"
          />
        </label>
        <button
          type="button"
          className="outline"
          disabled={busy || !!pending || loading || !promotionInput.trim()}
          onClick={() => {
            setAppliedPromotion(promotionInput.trim());
            setRevision((n) => n + 1);
          }}
        >
          Áp dụng mã
        </button>
        {appliedPromotion && !pending && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              setPromotionInput("");
              setAppliedPromotion("");
            }}
          >
            Bỏ mã
          </button>
        )}
      </div>
      {loading ? (
        <p role="status">Đang kiểm tra giá và tồn kho…</p>
      ) : !quote ? (
        <div className="stack">
          <p>
            {items.length
              ? "Chưa thể báo giá giỏ hàng này."
              : "Giỏ hàng đang trống."}
          </p>
          {items.length > 0 && (
            <button
              className="outline"
              onClick={() => setRevision((n) => n + 1)}
            >
              Kiểm tra lại
            </button>
          )}
          <button className="primary" onClick={close}>
            Quay lại giỏ hàng
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="checkout-grid">
          <div className="stack">
            <h3>Thông tin nhận hàng</h3>
            <fieldset disabled={busy || !!pending} className="stack">
              {addresses.length > 0 && (
                <label>
                  Chọn địa chỉ đã lưu
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const a = addresses.find((a) => a.id === e.target.value);
                      if (a)
                        setDraft({
                          recipientName: a.recipientName,
                          phone: a.phone,
                          address: a.address,
                        });
                    }}
                  >
                    <option value="">Nhập địa chỉ mới</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} — {a.recipientName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {addressError && (
                <p className="muted small">
                  Chưa tải được địa chỉ đã lưu; bạn vẫn có thể nhập bên dưới.
                </p>
              )}
              <label>
                Người nhận
                <input
                  value={draft.recipientName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, recipientName: e.target.value }))
                  }
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
              <label>
                Số điện thoại
                <input
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, phone: e.target.value }))
                  }
                  required
                  pattern="(0[0-9]{9}|\+84[0-9]{9})"
                  maxLength={16}
                  type="tel"
                  autoComplete="tel"
                  placeholder="0901234567"
                />
              </label>
              <label>
                Địa chỉ nhận hàng
                <textarea
                  value={draft.address}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, address: e.target.value }))
                  }
                  required
                  minLength={10}
                  maxLength={500}
                  rows={4}
                  autoComplete="street-address"
                  placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                />
              </label>
            </fieldset>
            <p className="muted small">
              Hãy kiểm tra thông tin và tổng tiền trước khi xác nhận. Giá và tồn
              kho sẽ được kiểm tra lần cuối khi tạo đơn.
            </p>
          </div>
          <div>
            <Summary quote={quote} />
            <button
              className="primary full"
              disabled={
                busy || loading || quote.paymentMethod !== paymentMethod
              }
            >
              {busy
                ? "Đang xác nhận…"
                : pending
                  ? "Thử xác nhận lại"
                  : paymentMethod === "QR_DEMO"
                    ? "Tạo đơn và xem mã QR demo"
                    : "Xác nhận đặt hàng COD"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** Đọc trạng thái/lịch sử đơn và hiển thị hành động hợp lệ cho khách hoặc admin. */
export function OrderDetails({
  order,
  changed,
  management = false,
}: {
  order: Order;
  changed: (order: Order) => void;
  management?: boolean;
}) {
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
  const [busy, setBusy] = useState(false);
  /** Ngăn form mặc định, gửi thao tác đơn và xử lý trạng thái đang chờ/lỗi để không gửi hai lần. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const updated = await post<Order>(
        `/orders/${order.id}/${management ? "actions" : "cancel"}`,
        management ? { action, reason } : { reason },
      );
      setAction("");
      setReason("");
      changed(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <div className="order-title">
        <div>
          <p className="eyebrow">MÃ ĐƠN HÀNG</p>
          <strong className="order-id">{order.id}</strong>
          <p className="small muted">{date(order.createdAt)}</p>
        </div>
        <span className={`status-pill ${order.status.toLowerCase()}`}>
          {orderStatus[order.status]}
        </span>
      </div>
      <div className="order-state">
        <span>{shippingStatus[order.shippingStatus]}</span>
        <span>
          {order.paymentMethod === "QR_DEMO" ? "QR demo" : "COD"} ·{" "}
          {order.paymentMethod === "QR_DEMO"
            ? order.paymentStatus === "PAID"
              ? "Đã thanh toán demo"
              : "Chờ thanh toán demo"
            : order.paymentStatus === "PAID"
              ? "Đã thu tiền"
              : "Chưa thu tiền"}
        </span>
      </div>
      <div className="delivery">
        <h3>Thông tin nhận hàng</h3>
        <p>
          {order.recipientName} · {order.phone}
        </p>
        <p>{order.address}</p>
      </div>
      <Summary quote={order} />
      {!management &&
        order.paymentMethod === "QR_DEMO" &&
        order.status !== "CANCELLED" && (
          <QrDemoPayment order={order} changed={changed} />
        )}
      <details>
        <summary>Lịch sử xử lý ({order.events.length})</summary>
        <ol className="timeline">
          {order.events.map((e) => (
            <li key={e.id}>
              <strong>{e.action}</strong>
              <p>{e.reason}</p>
              <small>{date(e.createdAt)}</small>
            </li>
          ))}
        </ol>
      </details>
      <p className="muted small">{order.warrantyPolicy}</p>
      {management && (
        <AdminOrderTools
          key={order.updatedAt}
          order={order}
          changed={changed}
        />
      )}
      {error && <Notice error>{error}</Notice>}
      {!action && (
        <div className="order-actions">
          {order.status === "PENDING" && (
            <>
              {order.paymentStatus === "UNPAID" && (
                <button className="outline" onClick={() => setAction("CANCEL")}>
                  Hủy đơn
                </button>
              )}
              {management && (
                <button
                  className="primary"
                  onClick={() => setAction("CONFIRM")}
                >
                  Xác nhận đơn
                </button>
              )}
            </>
          )}
          {management &&
            order.status === "CONFIRMED" &&
            order.shippingStatus === "NOT_SHIPPED" && (
              <>
                {order.paymentStatus === "UNPAID" && (
                  <button
                    className="outline"
                    onClick={() => setAction("CANCEL")}
                  >
                    Hủy đơn
                  </button>
                )}
                <button
                  className="primary"
                  disabled={
                    order.paymentMethod === "QR_DEMO" &&
                    order.paymentStatus !== "PAID"
                  }
                  onClick={() => setAction("SHIP")}
                >
                  Bắt đầu giao hàng
                </button>
              </>
            )}
          {management &&
            order.status === "CONFIRMED" &&
            order.shippingStatus === "IN_TRANSIT" && (
              <button className="primary" onClick={() => setAction("COMPLETE")}>
                {order.paymentMethod === "QR_DEMO"
                  ? "Xác nhận giao hàng (QR đã thanh toán demo)"
                  : "Xác nhận giao hàng và thu COD"}
              </button>
            )}
        </div>
      )}
      {action && (
        <form className="stack action-form" onSubmit={submit}>
          <h3>
            {action === "CANCEL"
              ? "Xác nhận hủy đơn"
              : action === "COMPLETE"
                ? order.paymentMethod === "QR_DEMO"
                  ? "Xác nhận đã giao hàng"
                  : "Xác nhận đã giao và thu đủ tiền"
                : action === "SHIP"
                  ? "Chuyển sang đang giao"
                  : "Xác nhận xử lý đơn"}
          </h3>
          <label>
            {action === "COMPLETE"
              ? order.paymentMethod === "QR_DEMO"
                ? "Mã biên nhận / bằng chứng giao hàng"
                : "Mã biên nhận / bằng chứng thu tiền"
              : "Lý do hoặc ghi chú"}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={5}
              maxLength={500}
              rows={3}
            />
          </label>
          {action === "CANCEL" && (
            <p className="small muted">
              Hủy đơn sẽ hoàn lại tồn kho. Không thể mở lại đơn đã hủy.
            </p>
          )}
          <div className="order-actions">
            <button className="primary" disabled={busy}>
              {busy ? "Đang xử lý…" : "Xác nhận thao tác"}
            </button>
            <button
              type="button"
              className="outline"
              disabled={busy}
              onClick={() => setAction("")}
            >
              Quay lại
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Liệt kê/tìm/lọc/phân trang đơn, mở chi tiết và tích hợp công cụ tạo/sửa đơn quản trị. */
export function Orders({
  user,
  close,
  management = false,
  initial,
  resume,
  embedded = false,
  initialFilters,
}: {
  // Hồ sơ/danh tính hiện tại; quan hệ DB nếu dùng trong Prisma.
  user: User;
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  management?: boolean;
  // Render trong trang quản trị thay vì modal. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  embedded?: boolean;
  initial?: Order | null;
  initialFilters?: Partial<{
    // Từ khóa tìm kiếm do user nhập.
    q: string;
    // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
    status: string;
    // Trạng thái thanh toán UNPAID/PAID.
    paymentStatus: string;
    // Bộ lọc đơn hiện có/đã lưu trữ/tất cả.
    archive: string;
  }>;
  resume: () => void;
}) {
  // React state page: Trang hiện tại; đổi bộ lọc cần quay về trang đầu. setPage yêu cầu React render lại khi giá trị đổi.
  const [page, setPage] = useState(1);
  // React state result: Trang catalog mới nhất đã tải; null khi chưa có dữ liệu. setResult yêu cầu React render lại khi giá trị đổi.
  const [result, setResult] = useState<Page<Order> | null>(null);
  // React state selected: Bản ghi đang được chọn để xem/sửa. setSelected yêu cầu React render lại khi giá trị đổi.
  const [selected, setSelected] = useState<Order | null>(initial ?? null);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    paymentStatus: "",
    archive: "active",
    ...initialFilters,
  });
  const filterQuery = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => !!v),
  ).toString();
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  // React state loading: Đang tải dữ liệu để hiển thị skeleton/thông báo. setLoading yêu cầu React render lại khi giá trị đổi.
  const [loading, setLoading] = useState(true);
  // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
  const [revision, setRevision] = useState(0);
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<Page<Order>>(
      `/orders${management ? "/manage" : ""}?page=${page}&limit=10${management ? "&" + filterQuery : ""}`,
      { signal: controller.signal },
    )
      .then(setResult)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, revision, management, filterQuery]);
  /** Chọn đơn để xem chi tiết và tải dữ liệu theo ID. */
  async function open(id: string) {
    setError("");
    try {
      setSelected(await api<Order>(`/orders/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <AdminPanel
      embedded={embedded}
      title={management ? "Xử lý đơn hàng" : "Đơn hàng của tôi"}
      close={close}
      wide
    >
      {error && <Notice error>{error}</Notice>}
      {!management && hasPendingOrder(user.id) && (
        <Notice>
          Có một yêu cầu đặt hàng chưa rõ kết quả.{" "}
          <button className="text-button" onClick={resume}>
            Kiểm tra yêu cầu
          </button>
        </Notice>
      )}
      {creating ? (
        <AdminCreateOrder
          adminId={user.id}
          close={() => setCreating(false)}
          placed={(order) => {
            setCreating(false);
            setSelected(order);
            setRevision((n) => n + 1);
          }}
        />
      ) : selected ? (
        <>
          <button
            className="text-button order-back"
            onClick={() => {
              setSelected(null);
              setRevision((n) => n + 1);
            }}
          >
            ← Danh sách đơn hàng
          </button>
          <OrderDetails
            key={selected.id}
            order={selected}
            management={management}
            changed={(order) => {
              setSelected(order);
              setRevision((n) => n + 1);
            }}
          />
          <button
            className="outline full"
            onClick={() => void open(selected.id)}
          >
            Cập nhật trạng thái
          </button>
        </>
      ) : (
        <>
          {management && (
            <div className="admin-filter-grid">
              <label>
                Tìm đơn
                <input
                  value={filters.q}
                  placeholder="Mã đơn, tên, email hoặc điện thoại"
                  maxLength={100}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, q: e.target.value }));
                    setPage(1);
                  }}
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, status: e.target.value }));
                    setPage(1);
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(orderStatus).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Thanh toán
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => {
                    setFilters((f) => ({
                      ...f,
                      paymentStatus: e.target.value,
                    }));
                    setPage(1);
                  }}
                >
                  <option value="">Tất cả thanh toán</option>
                  <option value="UNPAID">Chưa thanh toán</option>
                  <option value="PAID">Đã thanh toán</option>
                </select>
              </label>
              <label>
                Danh sách
                <select
                  value={filters.archive}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, archive: e.target.value }));
                    setPage(1);
                  }}
                >
                  <option value="active">Đang quản lý</option>
                  <option value="archived">Đã lưu trữ</option>
                  <option value="all">Tất cả đơn</option>
                </select>
              </label>
              <button className="primary" onClick={() => setCreating(true)}>
                Tạo đơn hàng
              </button>
            </div>
          )}
          <div className="orders-toolbar">
            <p className="muted small">{result?.meta.total ?? 0} đơn hàng</p>
            <button
              className="text-button"
              onClick={() => setRevision((n) => n + 1)}
            >
              Làm mới
            </button>
          </div>
          {loading ? (
            <p role="status">Đang tải đơn hàng…</p>
          ) : !result?.data.length ? (
            <div className="empty">
              <h3>Chưa có đơn hàng</h3>
              <p>Đơn của bạn sẽ được hiển thị tại đây sau khi đặt hàng.</p>
            </div>
          ) : (
            <div className="stack">
              {result.data.map((order) => (
                <button
                  className="order-card"
                  key={order.id}
                  onClick={() => void open(order.id)}
                >
                  <div>
                    <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                    <p>{date(order.createdAt)}</p>
                    {management && (
                      <p>
                        {order.recipientName} · {order.phone}
                        {order.archivedAt ? " · Đã lưu trữ" : ""}
                      </p>
                    )}
                    <p>
                      {order.items.length} sản phẩm · {money(order.totalVnd)}
                    </p>
                  </div>
                  <span className={`status-pill ${order.status.toLowerCase()}`}>
                    {orderStatus[order.status]}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="pagination">
            <button
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </button>
            <span>
              Trang {page} / {Math.max(1, result?.meta.totalPages ?? 1)}
            </span>
            <button
              disabled={loading || page >= (result?.meta.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </button>
          </div>
        </>
      )}
    </AdminPanel>
  );
}
