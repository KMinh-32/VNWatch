/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/AdminCreateOrder.tsx
 * Admin lập đơn cho khách đang hoạt động; lấy báo giá server và giữ request key/body cho lần thử lại.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError, money } from "./api";
import { Notice } from "./components";
import type { Order, Page, Product, Quote, User, Variant } from "./types";
/** Mẫu và SKU trong danh mục quản trị để admin chọn khi tạo đơn. */
type ManagedProduct = Omit<Product, "variants"> & {
  // Trạng thái nghiệp vụ của đối tượng; xem enum/DTO tương ứng.
  status: string;
  // Các phiên bản/SKU thuộc một mẫu.
  variants: (Variant & { stockQuantity: number; status: string })[];
};
/** JSON đầu vào thao tác đặt hàng; giá thật vẫn được backend đọc và tính lại. */
type Body = {
  // ID chủ sở hữu; phía server xác định từ phiên hoặc kiểm tra quyền admin.
  userId: string;
  // Các dòng SKU/số lượng hoặc snapshot đơn.
  items: { variantId: string; quantity: number }[];
  // Tên người nhận hàng.
  recipientName: string;
  // Số điện thoại người nhận.
  phone: string;
  // Địa chỉ nhận hàng.
  address: string;
  // Lý do thao tác, được ghi vào lịch sử/audit.
  reason: string;
  // COD hoặc QR_DEMO; dự án chưa thu tiền thật.
  paymentMethod: "COD" | "QR_DEMO";
  // Mã giảm giá được khách chọn và lưu vào đơn. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  promotionCode?: string;
  // Tổng khách đã xem; server đối chiếu lại để phát hiện giá thay đổi.
  expectedTotalVnd: number;
};
/** Yêu cầu đặt chưa rõ kết quả: giữ key, body và quote để retry không tạo đơn trùng. */
type Pending = { key: string; body: Body; quote: Quote };
/** Khóa request đang chờ theo adminId, không trộn yêu cầu của các admin. */
const storageKey = (id: string) => "vnwatch.admin.pending." + id;
/** Đọc request admin đã lưu và kiểm tra cấu trúc tối thiểu để phục hồi lần thử lại. */
function load(id: string): Pending | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(storageKey(id)) ?? "null");
    return p?.key &&
      p?.body?.userId &&
      Array.isArray(p.body.items) &&
      Number.isSafeInteger(p?.quote?.totalVnd)
      ? p
      : null;
  } catch {
    return null;
  }
}
/** Tải/tìm khách và SKU, chọn phương thức/mã, lấy báo giá server rồi tạo đơn cho khách. */
export function AdminCreateOrder({
  adminId,
  placed,
  close,
}: {
  // ID admin dùng phân tách request đang chờ trong sessionStorage.
  adminId: string;
  // Callback báo đơn đã được server tạo thành công.
  placed: (o: Order) => void;
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
}) {
  // React state pending: Request chưa rõ kết quả; giữ cùng key/body khi thử lại. setPending yêu cầu React render lại khi giá trị đổi.
  const [pending, setPending] = useState<Pending | null>(() => load(adminId));
  // React state users: Danh sách tài khoản đã tải theo bộ lọc. setUsers yêu cầu React render lại khi giá trị đổi.
  const [users, setUsers] = useState<User[]>([]),
    // React state products: Danh mục được tải từ API. setProducts yêu cầu React render lại khi giá trị đổi.
    [products, setProducts] = useState<ManagedProduct[]>([]),
    [userSearch, setUserSearch] = useState(""),
    [productSearch, setProductSearch] = useState("");
  // React state draft: Dữ liệu form chưa gửi; chưa phải bản ghi đã lưu. setDraft yêu cầu React render lại khi giá trị đổi.
  const [draft, setDraft] = useState<Body>(
    () =>
      load(adminId)?.body ?? {
        userId: "",
        items: [],
        recipientName: "",
        phone: "",
        address: "",
        reason: "",
        paymentMethod: "COD",
        expectedTotalVnd: 0,
      },
  );
  // React state quote: Báo giá server hiện tại, cần lấy lại khi thông tin ảnh hưởng giá đổi. setQuote yêu cầu React render lại khi giá trị đổi.
  const [quote, setQuote] = useState<Quote | null>(
      () => load(adminId)?.quote ?? null,
    ),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState(""),
    // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
    [busy, setBusy] = useState(false),
    // React state variantId: SKU đang được chọn để xem/sửa hoặc thêm vào đơn. setVariantId yêu cầu React render lại khi giá trị đổi.
    [variantId, setVariantId] = useState("");
  // Debounce: chờ user ngừng gõ trước khi truy vấn; cleanup hủy timer/lượt tải cũ.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    // Debounce 200 ms tìm khách/SKU và tải song song; cleanup hủy timer/request khi từ khóa đổi.
    const timer = setTimeout(() => {
      void Promise.all([
        api<Page<User>>(
          "/users?status=ACTIVE&limit=50&q=" + encodeURIComponent(userSearch),
          { signal: controller.signal },
        ),
        api<Page<ManagedProduct>>(
          "/management/products?limit=50&q=" +
            encodeURIComponent(productSearch),
          { signal: controller.signal },
        ),
      ])
        .then(([u, p]) => {
          setUsers(u.data);
          setProducts(p.data.filter((x) => x.status === "ACTIVE"));
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [userSearch, productSearch]);
  const options = products.flatMap((p) =>
    p.variants
      .filter((v) => v.status === "ACTIVE" && v.stockQuantity > 0)
      .map((v) => ({ ...v, productName: p.name })),
  );
  /** Gộp patch vào draft; thay dữ liệu ảnh hưởng giá thì xóa báo giá cũ. */
  function change(patch: Partial<Body>, reprice = false) {
    setDraft((d) => ({ ...d, ...patch }));
    if (reprice) setQuote(null);
  }
  /** Gọi endpoint báo giá quản trị theo userId khách, SKU và mã giảm giá. */
  async function price() {
    setError("");
    setBusy(true);
    try {
      setQuote(
        await api<Quote>("/orders/manage/quote", {
          method: "POST",
          body: JSON.stringify({
            userId: draft.userId,
            items: draft.items,
            paymentMethod: draft.paymentMethod,
            ...(draft.promotionCode
              ? { promotionCode: draft.promotionCode }
              : {}),
          }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  /** Lưu key/body trước POST; mất phản hồi giữ nguyên để thử lại, lỗi 400/409 chắc chắn mới bỏ request cũ. */
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!quote || busy) return;
    const request = pending ?? {
      key: crypto.randomUUID(),
      quote,
      body: {
        ...draft,
        recipientName: draft.recipientName.trim(),
        phone: draft.phone.trim(),
        address: draft.address.trim(),
        reason: draft.reason.trim(),
        expectedTotalVnd: quote.totalVnd,
      },
    };
    try {
      // Lưu request theo admin trước khi gửi; body đã chọn khách/phương thức/giá không đổi khi thử lại.
      sessionStorage.setItem(storageKey(adminId), JSON.stringify(request));
    } catch {
      setError(
        "Không lưu được yêu cầu an toàn vào phiên trình duyệt. Hãy cho phép lưu trữ rồi thử lại.",
      );
      return;
    }
    setPending(request);
    setBusy(true);
    setError("");
    try {
      const order = await api<Order>("/orders/manage", {
        method: "POST",
        headers: { "Idempotency-Key": request.key },
        body: JSON.stringify(request.body),
      });
      sessionStorage.removeItem(storageKey(adminId));
      placed(order);
    } catch (e) {
      if (e instanceof ApiError && [400, 409].includes(e.status)) {
        sessionStorage.removeItem(storageKey(adminId));
        setPending(null);
        setQuote(null);
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      <h3>Tạo đơn cho khách hàng</h3>
      <p className="muted small">
        Đơn demo được lưu và trừ tồn kho. Giỏ hàng của khách được giữ nguyên.
      </p>
      {error && <Notice error>{error}</Notice>}
      {pending && (
        <Notice>
          Yêu cầu trước chưa rõ kết quả. Thông tin đã được giữ để thử lại cùng
          đơn và tránh tạo trùng.
        </Notice>
      )}
      <fieldset disabled={busy || !!pending} className="stack">
        <div className="admin-form-grid">
          <label>
            Tìm tài khoản
            <input
              value={userSearch}
              maxLength={100}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Tên hoặc email"
            />
          </label>
          <label>
            Tài khoản đặt hàng
            <select
              value={draft.userId}
              required
              onChange={(e) => {
                const u = users.find((x) => x.id === e.target.value);
                change(
                  {
                    userId: e.target.value,
                    recipientName: u?.displayName ?? "",
                  },
                  true,
                );
              }}
            >
              <option value="">Chọn tài khoản đang hoạt động</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName} · {u.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tìm sản phẩm
            <input
              value={productSearch}
              maxLength={100}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Tên hoặc thương hiệu"
            />
          </label>
          <label>
            Chọn phiên bản
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              <option value="">Chọn SKU còn hàng</option>
              {options.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.productName} · {v.sku} · Tồn {v.stockQuantity}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="outline"
          disabled={!variantId}
          onClick={() => {
            if (!draft.items.some((i) => i.variantId === variantId))
              change(
                { items: [...draft.items, { variantId, quantity: 1 }] },
                true,
              );
            setVariantId("");
          }}
        >
          Thêm vào đơn
        </button>
        {draft.items.map((line, index) => (
          <div className="summary-line" key={line.variantId}>
            <span>
              {quote?.items.find((v) => v.variantId === line.variantId)
                ?.productName ??
                options.find((v) => v.id === line.variantId)?.productName ??
                "Sản phẩm"}{" "}
              ·{" "}
              {options.find((v) => v.id === line.variantId)?.sku ??
                line.variantId.slice(0, 8)}
            </span>
            <label>
              Số lượng
              <input
                type="number"
                min={1}
                max={99}
                required
                value={line.quantity}
                onChange={(e) =>
                  change(
                    {
                      items: draft.items.map((i, n) =>
                        n === index
                          ? { ...i, quantity: Number(e.target.value) }
                          : i,
                      ),
                    },
                    true,
                  )
                }
              />
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                change(
                  { items: draft.items.filter((_, n) => n !== index) },
                  true,
                )
              }
            >
              Bỏ sản phẩm
            </button>
          </div>
        ))}
        <div className="admin-form-grid">
          <label>
            Người nhận
            <input
              value={draft.recipientName}
              required
              minLength={2}
              maxLength={80}
              onChange={(e) => change({ recipientName: e.target.value })}
            />
          </label>
          <label>
            Số điện thoại
            <input
              value={draft.phone}
              required
              pattern="(0[0-9]{9}|\\+84[0-9]{9})"
              onChange={(e) => change({ phone: e.target.value })}
            />
          </label>
          <label>
            Địa chỉ nhận hàng
            <textarea
              value={draft.address}
              required
              minLength={10}
              maxLength={500}
              onChange={(e) => change({ address: e.target.value })}
            />
          </label>
          <label>
            Lý do tạo đơn
            <textarea
              value={draft.reason}
              required
              minLength={5}
              maxLength={500}
              onChange={(e) => change({ reason: e.target.value })}
            />
          </label>
          <label>
            Thanh toán
            <select
              value={draft.paymentMethod}
              onChange={(e) =>
                change(
                  { paymentMethod: e.target.value as Body["paymentMethod"] },
                  true,
                )
              }
            >
              <option value="COD">COD</option>
              <option value="QR_DEMO">QR demo — không thu tiền thật</option>
            </select>
          </label>
          <label>
            Mã giảm giá
            <input
              value={draft.promotionCode ?? ""}
              maxLength={32}
              onChange={(e) =>
                change(
                  {
                    promotionCode:
                      e.target.value.trim().toUpperCase() || undefined,
                  },
                  true,
                )
              }
            />
          </label>
        </div>
        <button
          type="button"
          className="outline"
          disabled={!draft.userId || !draft.items.length}
          onClick={() => void price()}
        >
          Tính tổng và kiểm tra tồn kho
        </button>
      </fieldset>
      {quote && (
        <div className="order-summary">
          {quote.items.map((i) => (
            <div className="summary-line" key={i.variantId}>
              <span>
                {i.productName} × {i.quantity}
              </span>
              <strong>{money(i.lineTotalVnd)}</strong>
            </div>
          ))}
          <p>
            Phí giao hàng: {money(quote.shippingFeeVnd)} · Giảm:{" "}
            {money(quote.discountVnd)}
          </p>
          <div className="cart-total">
            <span>Tổng thanh toán</span>
            <strong>{money(quote.totalVnd)}</strong>
          </div>
        </div>
      )}
      <div className="order-actions">
        <button className="primary" disabled={busy || !quote}>
          {busy
            ? "Đang xử lý…"
            : pending
              ? "Thử tạo lại cùng đơn"
              : "Xác nhận tạo đơn"}
        </button>
        <button
          type="button"
          className="outline"
          disabled={busy}
          onClick={close}
        >
          Quay lại danh sách
        </button>
      </div>
    </form>
  );
}
