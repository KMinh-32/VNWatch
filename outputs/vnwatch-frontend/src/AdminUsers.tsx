/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/AdminUsers.tsx
 * Quản trị tài khoản: tìm/lọc, tạo/sửa quyền, khóa user, mở khóa đăng nhập và thu hồi phiên.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, post } from "./api";
import { Notice } from "./components";
import { Pager } from "./Shopping";
import type { Page, User } from "./types";
const roleName: Record<string, string> = {
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  CUSTOMER: "Khách hàng",
};
/** Tải trang tài khoản theo bộ lọc và cung cấp form tạo/sửa cùng các hành động phiên. */
export function AdminUsers({
  currentUser,
  selfChanged,
  initialRole = "",
}: {
  currentUser: User;
  selfChanged: () => void;
  initialRole?: "" | "CUSTOMER";
}) {
  // React state rows: Danh sách dữ liệu đang được màn hình hiển thị. setRows yêu cầu React render lại khi giá trị đổi.
  const [rows, setRows] = useState<Page<User> | null>(null),
    // React state selected: Bản ghi đang được chọn để xem/sửa. setSelected yêu cầu React render lại khi giá trị đổi.
    [selected, setSelected] = useState<User | null>(null),
    [creating, setCreating] = useState(false);
  // React state page: Trang hiện tại; đổi bộ lọc cần quay về trang đầu. setPage yêu cầu React render lại khi giá trị đổi.
  const [page, setPage] = useState(1),
    [q, setQ] = useState(""),
    [role, setRole] = useState<string>(initialRole),
    // React state status: Trạng thái dữ liệu/dịch vụ đang hiển thị. setStatus yêu cầu React render lại khi giá trị đổi.
    [status, setStatus] = useState("");
  // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
  const [revision, setRevision] = useState(0),
    // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
    [busy, setBusy] = useState(false),
    // React state loading: Đang tải dữ liệu để hiển thị skeleton/thông báo. setLoading yêu cầu React render lại khi giá trị đổi.
    [loading, setLoading] = useState(false),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState(""),
    // React state message: Thông báo kết quả thao tác. setMessage yêu cầu React render lại khi giá trị đổi.
    [message, setMessage] = useState("");
  // Effect quản lý timer của màn hình; cleanup giải phóng timer khi dữ liệu đổi hoặc component bị tháo.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        ...(q ? { q } : {}),
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
      });
      api<Page<User>>("/users?" + params, { signal: controller.signal })
        .then(setRows)
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, q, role, status, revision]);
  /** Đọc form và gửi tạo/sửa tài khoản; tải lại danh sách sau khi server lưu. */
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (creating) await post("/users", d);
      else if (selected) {
        await api("/users/" + selected.id, {
          method: "PATCH",
          body: JSON.stringify({
            displayName: d.displayName,
            role: d.role,
            status: d.status,
            reason: d.reason,
          }),
        });
        if (
          selected.id === currentUser.id &&
          (d.role !== currentUser.role || d.status !== currentUser.status)
        ) {
          selfChanged();
          return;
        }
      }
      setCreating(false);
      setSelected(null);
      setRevision((n) => n + 1);
      setMessage("Đã lưu tài khoản và nhật ký.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  /** Gửi yêu cầu thu hồi phiên hoặc mở khóa đăng nhập với lý do quản trị. */
  async function sessionAction(
    mode: "revoke-sessions" | "unlock-login",
    form: HTMLFormElement,
  ) {
    if (!selected) return;
    const reason = String(new FormData(form).get("reason") ?? "").trim();
    if (reason.length < 5) {
      setError("Nhập lý do tối thiểu 5 ký tự trước khi thao tác.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/users/" + selected.id + "/" + mode, { reason });
      if (selected.id === currentUser.id) {
        selfChanged();
        return;
      }
      setMessage(
        mode === "unlock-login"
          ? "Đã mở khóa đăng nhập tạm thời và thu hồi phiên."
          : "Đã thu hồi toàn bộ phiên và mã reset của tài khoản.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Danh sách tài khoản</h2>
          <p className="muted small">
            Tạo tài khoản, phân quyền, khóa truy cập và quản lý phiên.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setCreating(true);
            setSelected(null);
            setError("");
          }}
        >
          Thêm tài khoản
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {creating || selected ? (
        <form
          key={selected?.id ?? "new"}
          className="stack admin-editor"
          onSubmit={save}
        >
          <h3>{creating ? "Tạo tài khoản mới" : selected?.email}</h3>
          <label>
            Tên hiển thị
            <input
              name="displayName"
              defaultValue={selected?.displayName}
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          {creating && (
            <>
              <label>
                Email
                <input name="email" type="email" required maxLength={254} />
              </label>
              <label>
                Mật khẩu ban đầu
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={15}
                  maxLength={128}
                />
              </label>
              <small>Từ 15 đến 128 ký tự. Mật khẩu được băm ở server.</small>
            </>
          )}
          <div className="feature-grid">
            <label>
              Vai trò
              <select name="role" defaultValue={selected?.role ?? "CUSTOMER"}>
                {Object.entries(roleName).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {!creating && (
              <label>
                Trạng thái tài khoản
                <select name="status" defaultValue={selected?.status}>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="BLOCKED">Khóa tài khoản</option>
                </select>
              </label>
            )}
          </div>
          <label>
            Lý do thay đổi
            <input name="reason" minLength={5} maxLength={200} required />
          </label>
          {!creating && (
            <p className="small muted">
              Đổi vai trò hoặc trạng thái sẽ thu hồi các phiên đăng nhập. Phải
              giữ ít nhất một admin đang hoạt động.
            </p>
          )}
          <div className="order-actions">
            <button className="primary" disabled={busy}>
              Lưu tài khoản
            </button>
            <button
              type="button"
              className="outline"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setCreating(false);
              }}
            >
              Quay lại danh sách
            </button>
          </div>
          {selected && (
            <div className="order-actions">
              <button
                type="button"
                className="outline"
                disabled={busy}
                onClick={(e) =>
                  void sessionAction("revoke-sessions", e.currentTarget.form!)
                }
              >
                Thu hồi toàn bộ phiên
              </button>
              <button
                type="button"
                className="outline"
                disabled={busy}
                onClick={(e) =>
                  void sessionAction("unlock-login", e.currentTarget.form!)
                }
              >
                Mở khóa đăng nhập tạm thời
              </button>
            </div>
          )}
        </form>
      ) : (
        <>
          <div className="admin-filters">
            <label>
              Tìm tài khoản
              <input
                placeholder="Tên hoặc email…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Lọc vai trò
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả</option>
                {Object.entries(roleName).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lọc trạng thái
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="BLOCKED">Bị khóa</option>
              </select>
            </label>
            <button
              className="outline"
              onClick={() => setRevision((n) => n + 1)}
            >
              Tải lại
            </button>
          </div>
          {loading ? (
            <p role="status">Đang tải tài khoản…</p>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tài khoản</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows?.data.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.displayName}</strong>
                          <small>{u.email}</small>
                        </td>
                        <td>{roleName[u.role]}</td>
                        <td>
                          <span
                            className={
                              "status-pill " +
                              (u.status === "ACTIVE"
                                ? "completed"
                                : "cancelled")
                            }
                          >
                            {u.status === "ACTIVE" ? "Hoạt động" : "Bị khóa"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="outline"
                            aria-label={"Quản lý " + u.email}
                            onClick={() => {
                              setSelected(u);
                              setError("");
                              setMessage("");
                            }}
                          >
                            Quản lý
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows?.data.length && <p>Không có tài khoản phù hợp.</p>}
              <Pager meta={rows?.meta} change={setPage} />
            </>
          )}
        </>
      )}
    </section>
  );
}
