/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/Shopping.tsx
 * Các màn hình địa chỉ, yêu thích, so sánh, hỗ trợ, bảo hành, đánh giá và hướng dẫn mua hàng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, date, money, post } from "./api";
import {
  AdminPanel,
  Modal,
  Notice,
  ProductImage,
  caseSize,
} from "./components";
import type {
  Favorite,
  Page,
  Product,
  Review,
  SavedAddress,
  SupportTicket,
  WarrantyCard,
} from "./types";

/** Chỉ hiển thị phân trang khi có nhiều trang và chặn nút vượt phạm vi. */
export function Pager({
  meta,
  change,
}: {
  // Thông tin phân trang đi cùng data.
  meta: Page<unknown>["meta"] | undefined;
  // Callback cập nhật lựa chọn/trang.
  change: (n: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={meta.page <= 1} onClick={() => change(meta.page - 1)}>
        Trước
      </button>
      <span>
        {meta.page} / {meta.totalPages}
      </span>
      <button
        disabled={meta.page >= meta.totalPages}
        onClick={() => change(meta.page + 1)}
      >
        Sau
      </button>
    </div>
  );
}
/** Quản lý địa chỉ nhận hàng của user qua các API riêng tư. */
export function Addresses({ close }: { close: () => void }) {
  // React state rows: Danh sách dữ liệu đang được màn hình hiển thị. setRows yêu cầu React render lại khi giá trị đổi.
  const [rows, setRows] = useState<SavedAddress[]>([]),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState(""),
    // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
    [busy, setBusy] = useState(false),
    // React state loading: Đang tải dữ liệu để hiển thị skeleton/thông báo. setLoading yêu cầu React render lại khi giá trị đổi.
    [loading, setLoading] = useState(true);
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController. Mảng []: chạy khi mount, cleanup khi unmount.
  useEffect(() => {
    api<SavedAddress[]>("/shop/addresses")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  /** Lấy dữ liệu form, gửi tạo/cập nhật tới API của màn hình này rồi tải lại trạng thái đã xác nhận. */
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await post("/shop/addresses", Object.fromEntries(new FormData(form)));
      setRows(await api("/shop/addresses"));
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  /** Xóa địa chỉ qua API theo ID, cập nhật danh sách sau thành công. */
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/shop/addresses/${id}`, { method: "DELETE" });
      setRows((r) => r.filter((a) => a.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Địa chỉ nhận hàng" close={close} wide>
      {error && <Notice error>{error}</Notice>}
      <p className="muted">
        Lưu tối đa 10 địa chỉ để chọn nhanh khi đặt hàng. Chỉ tài khoản của bạn
        truy cập được.
      </p>
      <div className="feature-grid">
        <div className="stack">
          {loading ? (
            <p>Đang tải địa chỉ…</p>
          ) : rows.length ? (
            rows.map((a) => (
              <article className="feature-card" key={a.id}>
                <h3>{a.label}</h3>
                <p>
                  {a.recipientName} · {a.phone}
                </p>
                <p>{a.address}</p>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void remove(a.id)}
                >
                  Xóa địa chỉ {a.label}
                </button>
              </article>
            ))
          ) : (
            <Notice>Chưa có địa chỉ đã lưu.</Notice>
          )}
        </div>
        <form className="stack" onSubmit={submit}>
          <h3>Thêm địa chỉ</h3>
          <label>
            Tên địa chỉ
            <input
              name="label"
              placeholder="Nhà riêng / Văn phòng"
              required
              maxLength={40}
            />
          </label>
          <label>
            Người nhận
            <input
              name="recipientName"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </label>
          <label>
            Số điện thoại
            <input
              name="phone"
              type="tel"
              required
              pattern="(0[0-9]{9}|\+84[0-9]{9})"
              autoComplete="tel"
            />
          </label>
          <label>
            Địa chỉ
            <textarea
              name="address"
              rows={3}
              required
              minLength={10}
              maxLength={500}
              autoComplete="street-address"
            />
          </label>
          <button className="primary" disabled={busy || rows.length >= 10}>
            {busy ? "Đang lưu…" : "Lưu địa chỉ"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
/** Đọc danh sách yêu thích và thông tin mẫu hiện có để mở chi tiết/thêm giỏ/bỏ lưu. */
export function Favorites({
  rows,
  close,
  open,
  remove,
  loading,
  loadError,
  retry,
}: {
  rows: Favorite[];
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  open: (id: string) => void;
  remove: (id: string) => Promise<void>;
  loading: boolean;
  loadError: string;
  retry: () => void;
}) {
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState(""),
    // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
    [busy, setBusy] = useState("");
  /** Bỏ yêu thích qua API rồi lọc lại danh sách. */
  async function discard(id: string) {
    setBusy(id);
    setError("");
    try {
      await remove(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <Modal title="Sản phẩm yêu thích" close={close}>
      {error && <Notice error>{error}</Notice>}
      <p className="muted">Danh sách được lưu riêng theo tài khoản của bạn.</p>
      {loading ? (
        <p>Đang tải sản phẩm yêu thích…</p>
      ) : loadError ? (
        <>
          <Notice error>{loadError}</Notice>
          <button onClick={retry}>Thử lại</button>
        </>
      ) : rows.length ? (
        rows.map((r) => (
          <article key={r.productId} className="feature-card">
            <h3>{r.name}</h3>
            {!r.available && (
              <p className="muted">Sản phẩm đã ngừng kinh doanh.</p>
            )}
            <div className="order-actions">
              <button
                className="primary"
                disabled={!r.available}
                onClick={() => open(r.productId)}
              >
                Xem sản phẩm
              </button>
              <button
                className="text-button"
                disabled={busy === r.productId}
                onClick={() => void discard(r.productId)}
              >
                Bỏ yêu thích
              </button>
            </div>
          </article>
        ))
      ) : (
        <Notice>
          Chưa có sản phẩm yêu thích. Bấm trái tim tại bộ sưu tập để lưu.
        </Notice>
      )}
    </Modal>
  );
}
/** Tải tối đa ba mẫu và đặt thông số từng mẫu cạnh nhau. */
export function Comparison({
  ids,
  close,
  remove,
  open,
}: {
  ids: string[];
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  remove: (id: string) => void;
  open: (id: string) => void;
}) {
  // React state rows: Danh sách dữ liệu đang được màn hình hiển thị. setRows yêu cầu React render lại khi giá trị đổi.
  const [rows, setRows] = useState<Product[]>([]),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState("");
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    let alive = true;
    setError("");
    Promise.all(ids.map((id) => api<Product>(`/products/${id}`)))
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [ids]);
  return (
    <Modal title="So sánh đồng hồ" close={close} wide>
      <p className="muted">
        So sánh tối đa 3 mẫu. Giá và thông số của phiên bản có giá thấp nhất còn
        kinh doanh.
      </p>
      {error && <Notice error>{error}</Notice>}
      {ids.length ? (
        <div className="compare-grid">
          {rows.map((p) => {
            const v = [...p.variants].sort(
              (a, b) => a.priceVnd - b.priceVnd,
            )[0];
            return (
              <article className="feature-card" key={p.id}>
                <div className="comparison-photo">
                  <ProductImage product={p} eager />
                </div>
                <h3>{p.name}</h3>
                <strong className="price">
                  {v ? money(v.priceVnd) : "Chưa có giá"}
                </strong>
                <dl className="specs">
                  {[
                    ["Thương hiệu", p.brand],
                    ["Bộ máy", v?.movementType],
                    ["Kích thước", caseSize(v)],
                    ["Vỏ", v?.caseMaterial],
                    ["Kính", v?.crystalMaterial],
                    ["Dây", v?.strapMaterial],
                    ["Chịu nước", `${v?.waterResistanceM ?? 0} m`],
                    [
                      "Bảo hành",
                      v?.warrantyMonths == null
                        ? "Chưa thiết lập"
                        : `${v.warrantyMonths} tháng`,
                    ],
                    ["Khả dụng", v?.inStock ? "Còn hàng" : "Hết hàng"],
                  ].map(([k, value]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <button className="primary full" onClick={() => open(p.id)}>
                  Xem chi tiết
                </button>
                <button className="text-button" onClick={() => remove(p.id)}>
                  Bỏ khỏi so sánh
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <Notice>Chọn “So sánh” ở các sản phẩm để bắt đầu.</Notice>
      )}
    </Modal>
  );
}
export const ticketStatus: Record<string, string> = {
  OPEN: "Mới gửi",
  IN_REVIEW: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  REJECTED: "Không được chấp nhận",
};
/** Liệt kê ticket, tạo yêu cầu/trả lời; chế độ quản trị còn xử lý trạng thái. */
export function Support({
  close,
  embedded = false,
  management = false,
  warrantyId,
  orderId,
  initialState = "all",
}: {
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  management?: boolean;
  initialState?: "all" | "open";
  warrantyId?: string;
  // ID đơn hàng liên quan. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  orderId?: string;
  // Render trong trang quản trị thay vì modal. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  embedded?: boolean;
}) {
  // React state rows: Danh sách dữ liệu đang được màn hình hiển thị. setRows yêu cầu React render lại khi giá trị đổi.
  const [rows, setRows] = useState<Page<SupportTicket> | null>(null),
    // React state page: Trang hiện tại; đổi bộ lọc cần quay về trang đầu. setPage yêu cầu React render lại khi giá trị đổi.
    [page, setPage] = useState(1),
    // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
    [revision, setRevision] = useState(0),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState(""),
    // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
    [busy, setBusy] = useState(false),
    // React state selected: Bản ghi đang được chọn để xem/sửa. setSelected yêu cầu React render lại khi giá trị đổi.
    [selected, setSelected] = useState<string | null>(null);
  const [kind, setKind] = useState(
    warrantyId ? "WARRANTY" : orderId ? "ORDER" : "GENERAL",
  );
  const [state, setState] = useState<string>(initialState);
  const ticket = rows?.data.find((t) => t.id === selected);
  const base = management ? "/management/tickets" : "/shop/tickets";
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    let alive = true;
    setError("");
    api<Page<SupportTicket>>(
      `${base}?page=${page}&limit=10${management ? "&state=" + state : ""}`,
    )
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [base, page, revision, management, state]);
  /** Lấy dữ liệu form, gửi tạo/cập nhật tới API của màn hình này rồi tải lại trạng thái đã xác nhận. */
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(form));
    try {
      if (ticket) {
        await post(`${base}/${ticket.id}/replies`, data);
      } else {
        const created = await post<SupportTicket>("/shop/tickets", {
          ...data,
          kind,
          ...(data.orderId ? {} : { orderId: undefined }),
          ...(kind === "WARRANTY" ? { orderItemId: warrantyId } : {}),
        });
        setSelected(created.id);
        setPage(1);
      }
      form.reset();
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminPanel
      title={management ? "Hỗ trợ khách hàng" : "Yêu cầu hỗ trợ"}
      embedded={embedded}
      close={close}
      wide
    >
      {error && <Notice error>{error}</Notice>}
      <p className="muted">
        Yêu cầu được lưu trong hệ thống demo. Chưa gửi email/SMS và chưa cam kết
        thời gian phản hồi.
      </p>
      {management && (
        <div className="management-toolbar">
          <label>
            Danh sách yêu cầu
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(1);
                setRows(null);
                setSelected(null);
              }}
            >
              <option value="all">Tất cả yêu cầu</option>
              <option value="open">Đang mở / Đang xử lý</option>
              <option value="closed">Đã kết thúc</option>
            </select>
          </label>
        </div>
      )}
      <div className="feature-grid">
        <div className="stack">
          {!rows && error ? (
            <button onClick={() => setRevision((n) => n + 1)}>
              Thử tải lại
            </button>
          ) : !rows ? (
            <p>Đang tải yêu cầu…</p>
          ) : !rows.data.length ? (
            <Notice>Chưa có yêu cầu hỗ trợ.</Notice>
          ) : (
            rows.data.map((t) => (
              <button
                key={t.id}
                className={`ticket-item ${selected === t.id ? "active" : ""}`}
                onClick={() => setSelected(t.id)}
              >
                <strong>{t.subject}</strong>
                <span>
                  {ticketStatus[t.status]} · {date(t.createdAt)}
                </span>
              </button>
            ))
          )}
          <Pager meta={rows?.meta} change={setPage} />
          {!management && (
            <button className="outline" onClick={() => setSelected(null)}>
              Tạo yêu cầu mới
            </button>
          )}
        </div>
        <div className="stack">
          {ticket ? (
            <>
              <h3>{ticket.subject}</h3>
              <p className="small muted">
                {ticketStatus[ticket.status]}
                {ticket.orderId ? ` · Đơn ${ticket.orderId}` : ""}
              </p>
              <div className="ticket-messages">
                {ticket.messages.map((m) => (
                  <article className="feature-card" key={m.id}>
                    <strong>
                      {m.authorName}{" "}
                      {m.authorRole !== "CUSTOMER" ? "· Nhân viên" : ""}
                    </strong>
                    <p className="user-text">{m.body}</p>
                    <small>{date(m.createdAt)}</small>
                  </article>
                ))}
              </div>
              {["OPEN", "IN_REVIEW"].includes(ticket.status) && (
                <form className="stack" onSubmit={submit}>
                  <label>
                    Phản hồi
                    <textarea
                      name="body"
                      required
                      minLength={5}
                      maxLength={2000}
                      rows={3}
                    />
                  </label>
                  {management && (
                    <label>
                      Trạng thái xử lý
                      <select name="status" defaultValue={ticket.status}>
                        {Object.entries(ticketStatus).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button className="primary" disabled={busy}>
                    {busy ? "Đang gửi…" : "Gửi phản hồi"}
                  </button>
                </form>
              )}
            </>
          ) : !management ? (
            <form className="stack" onSubmit={submit}>
              <h3>Tạo yêu cầu</h3>
              <label>
                Loại yêu cầu
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="GENERAL">Tư vấn / Hỗ trợ chung</option>
                  <option value="ORDER">Về đơn hàng</option>
                  {warrantyId && <option value="WARRANTY">Bảo hành</option>}
                </select>
              </label>
              {kind !== "GENERAL" && (
                <label>
                  Mã đơn hàng
                  <input
                    name="orderId"
                    defaultValue={orderId ?? ""}
                    required
                    readOnly={kind === "WARRANTY"}
                  />
                </label>
              )}
              <label>
                Tiêu đề
                <input name="subject" required minLength={5} maxLength={120} />
              </label>
              <label>
                Nội dung
                <textarea
                  name="body"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? "Đang gửi…" : "Gửi yêu cầu"}
              </button>
            </form>
          ) : (
            <Notice>Chọn yêu cầu để đọc và trả lời.</Notice>
          )}
        </div>
      </div>
    </AdminPanel>
  );
}
/** Đọc thẻ bảo hành đã đủ điều kiện từ backend và mở yêu cầu hỗ trợ theo thẻ. */
export function Warranties({
  close,
  request,
}: {
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  request: (c: WarrantyCard) => void;
}) {
  // React state rows: Danh sách dữ liệu đang được màn hình hiển thị. setRows yêu cầu React render lại khi giá trị đổi.
  const [rows, setRows] = useState<WarrantyCard[] | null>(null),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState(""),
    // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
    [revision, setRevision] = useState(0);
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    let alive = true;
    setError("");
    api<WarrantyCard[]>("/shop/warranties")
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [revision]);
  return (
    <Modal title="Bảo hành của tôi" close={close} wide>
      <Notice>
        Bảo hành demo kích hoạt khi đơn hoàn tất và đã thanh toán demo, dùng
        thời hạn tại lúc đặt. Mẫu chưa thiết lập bảo hành sẽ không tự được cấp
        phiếu. Chưa quản lý serial hoặc sửa chữa thực tế.
      </Notice>
      {error && <Notice error>{error}</Notice>}
      {rows === null && error ? (
        <button onClick={() => setRevision((n) => n + 1)}>Thử tải lại</button>
      ) : rows === null ? (
        <p>Đang tải bảo hành…</p>
      ) : rows.length ? (
        rows.map((c) => (
          <article className="feature-card" key={c.id}>
            <h3>{c.productName}</h3>
            <p>
              {c.sku} · {c.quantity} chiếc · {c.months} tháng
            </p>
            <p className="small">
              Kích hoạt: {date(c.activatedAt)}
              <br />
              Hết hạn: {date(c.expiresAt)}
            </p>
            <p className="muted">
              {c.active ? "Còn hiệu lực" : "Đã hết hạn"} · Không có serial
            </p>
            <button
              className="primary"
              disabled={!c.active}
              onClick={() => request(c)}
            >
              Yêu cầu bảo hành
            </button>
          </article>
        ))
      ) : (
        <p>Chưa có sản phẩm được kích hoạt bảo hành.</p>
      )}
    </Modal>
  );
}
/** Tải đánh giá công khai và form đánh giá; backend xác nhận mua hàng trước khi ghi. */
export function Reviews({
  id,
  signedIn,
  login,
}: {
  // Định danh bản ghi hoặc request để theo dõi/hủy.
  id: string;
  signedIn: boolean;
  login: () => void;
}) {
  // React state rows: Danh sách dữ liệu đang được màn hình hiển thị. setRows yêu cầu React render lại khi giá trị đổi.
  const [rows, setRows] = useState<
      (Page<Review> & { averageRating: number | null }) | null
    >(null),
    // React state page: Trang hiện tại; đổi bộ lọc cần quay về trang đầu. setPage yêu cầu React render lại khi giá trị đổi.
    [page, setPage] = useState(1),
    // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
    [revision, setRevision] = useState(0),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState(""),
    // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
    [busy, setBusy] = useState(false);
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    let alive = true;
    setError("");
    api<Page<Review> & { averageRating: number | null }>(
      `/shop/reviews/${id}?page=${page}&limit=5`,
    )
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [id, page, revision]);
  /** Lấy dữ liệu form, gửi tạo/cập nhật tới API của màn hình này rồi tải lại trạng thái đã xác nhận. */
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    try {
      await api(`/shop/reviews/${id}`, {
        method: "PUT",
        body: JSON.stringify({ body: d.body, rating: Number(d.rating) }),
      });
      setRevision((n) => n + 1);
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="reviews-section">
      <h3>
        Đánh giá từ người mua{" "}
        {rows?.averageRating ? `· ${rows.averageRating.toFixed(1)}/5` : ""}
      </h3>
      <p className="small muted">
        Chỉ tài khoản đã nhận sản phẩm và hoàn tất đơn được đánh giá. Không tạo
        đánh giá giả.
      </p>
      {error && <Notice error>{error}</Notice>}
      {!rows && error ? (
        <button onClick={() => setRevision((n) => n + 1)}>
          Thử tải lại đánh giá
        </button>
      ) : !rows ? (
        <p className="muted small">Đang tải đánh giá…</p>
      ) : rows.data.length ? (
        rows.data.map((r) => (
          <article className="review" key={r.id}>
            <strong>
              {"★".repeat(r.rating)}
              {"☆".repeat(5 - r.rating)} · {r.authorName}
            </strong>
            <p className="user-text">{r.body}</p>
            <small>Đã mua hàng · {date(r.updatedAt)}</small>
          </article>
        ))
      ) : (
        <p className="muted small">Chưa có đánh giá.</p>
      )}
      <Pager meta={rows?.meta} change={setPage} />
      {signedIn ? (
        <details>
          <summary>Viết hoặc cập nhật đánh giá</summary>
          <form className="stack" onSubmit={submit}>
            <label>
              Số sao
              <select name="rating" defaultValue="5">
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>
                    {v} sao
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nhận xét
              <textarea
                name="body"
                minLength={10}
                maxLength={1000}
                rows={3}
                required
              />
            </label>
            <button className="outline" disabled={busy}>
              Lưu đánh giá
            </button>
          </form>
        </details>
      ) : (
        <button className="text-button" onClick={login}>
          Đăng nhập để đánh giá
        </button>
      )}
    </section>
  );
}
/** Hiển thị hướng dẫn và chính sách demo để người mua hiểu cách dùng cửa hàng. */
export function Information({
  close,
  support,
}: {
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  support: () => void;
}) {
  return (
    <Modal title="Thông tin & hỗ trợ VNWatch" close={close} wide>
      <div className="feature-grid">
        <section className="stack">
          <p className="eyebrow">MUA HÀNG RÕ RÀNG</p>
          <h3>Hướng dẫn mua hàng</h3>
          <ol className="help-steps">
            <li>Tạo tài khoản và đăng nhập trước khi thêm giỏ.</li>
            <li>
              Chọn mẫu, phiên bản và số lượng. Có thể lưu yêu thích hoặc so
              sánh.
            </li>
            <li>
              Chọn địa chỉ, áp dụng mã giảm giá nếu có và kiểm tra báo giá.
            </li>
            <li>
              Chọn COD hoặc QR demo. Theo dõi trạng thái ở Đơn hàng của tôi.
            </li>
          </ol>
          <h3>Giao hàng & thanh toán</h3>
          <p>
            Phí giao hàng demo 30.000 VND. COD và QR đều là luồng giả lập;
            website chưa giao hàng hoặc thu tiền thật. QR hiện mã đơn và số
            tiền, không chứa tài khoản ngân hàng. Bấm “Mô phỏng thanh toán thành
            công” để thử; thanh toán online thật chưa cấu hình.
          </p>
          <h3>Bảo hành & đổi trả</h3>
          <p>
            Thời hạn từng SKU hiển thị trong chi tiết và được giữ tại lúc đặt.
            Bảo hành demo kích hoạt khi đơn hoàn tất. Mẫu chưa có thời hạn không
            được gán bảo hành tự động. Chính sách đổi trả thực tế chưa ban hành;
            hãy gửi yêu cầu hỗ trợ để hỏi về đơn của bạn.
          </p>
        </section>
        <section className="stack">
          <h3>Câu hỏi thường gặp</h3>
          {[
            [
              "Dữ liệu đồng hồ có thật không?",
              "Catalog thật có ảnh, thông số và giá tham khảo với nguồn trong chi tiết. Tồn kho khởi tạo 100 là giả lập, không đại diện kho cửa hàng thật.",
            ],
            [
              "Hủy đơn như thế nào?",
              "Đơn chờ xác nhận và chưa thanh toán có thể hủy tại Đơn hàng của tôi, ghi lý do. Tồn được hoàn đúng một lần. Đơn đã giao/thu tiền không có luồng hoàn tiền tự động.",
            ],
            [
              "Mã giảm giá dùng ra sao?",
              "Nhập mã tại bước đặt hàng; server kiểm tra thời hạn, đơn tối thiểu, tổng lượt và lượt mỗi tài khoản. Lượt dùng được tính khi tạo đơn và không được trả lại khi hủy.",
            ],
            [
              "Giỏ hàng có dùng trên thiết bị khác không?",
              "Giỏ và yêu thích được lưu theo tài khoản trên server; đăng nhập cùng tài khoản để tải lại. Token đăng nhập không được lưu vào localStorage.",
            ],
            [
              "Dữ liệu của tôi được dùng thế nào?",
              "Tài khoản lưu tên, email, địa chỉ và đơn bạn tạo. Chat không đọc đơn riêng; khi bật OpenAI, câu hỏi/lịch sử gần nhất được gửi tới nhà cung cấp. Không gửi mật khẩu hoặc thông tin nhạy cảm vào chat.",
            ],
            [
              "Làm sao liên hệ?",
              "Tạo yêu cầu hỗ trợ trong website và theo dõi phản hồi tại cùng màn hình. Bản demo chưa có hotline, email gửi thật hoặc thời gian phản hồi cam kết.",
            ],
          ].map(([q, a]) => (
            <details className="faq" key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
          <button className="primary" onClick={support}>
            Gửi yêu cầu hỗ trợ
          </button>
        </section>
      </div>
    </Modal>
  );
}
