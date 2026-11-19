/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/Account.tsx
 * Giao diện đăng nhập/đăng ký/reset và quản lý hồ sơ/phiên. Component Admin cũ được giữ trong nguồn nhưng không gắn vào cửa hàng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, date, post, setToken } from "./api";
import { Modal, Notice } from "./components";
import type { Login, Session, User, Page } from "./types";

/** Các chế độ được phép của form xác thực. */
type Mode = "login" | "register" | "forgot" | "reset";
const labels: Record<Mode, string> = {
  login: "Chào mừng trở lại",
  register: "Tạo tài khoản",
  forgot: "Quên mật khẩu",
  reset: "Đặt lại mật khẩu",
};
/** Form nhiều chế độ xác thực; token nhận sau login được giữ ở bộ nhớ và báo user cho App. */
export function Auth({
  close,
  loggedIn,
}: {
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  // Callback báo user sau đăng nhập thành công.
  loggedIn: (user: User) => void;
}) {
  // React state mode: Chế độ của form xác thực/hội thoại. setMode yêu cầu React render lại khi giá trị đổi.
  const [mode, setMode] = useState<Mode>("login");
  // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
  const [busy, setBusy] = useState(false);
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  // React state message: Thông báo kết quả thao tác. setMessage yêu cầu React render lại khi giá trị đổi.
  const [message, setMessage] = useState("");
  /** Đổi chế độ form và xóa thông báo/lỗi của chế độ cũ. */
  const switchMode = (value: Mode) => {
    setMode(value);
    setError("");
    setMessage("");
  };
  /** Ngăn submit HTML mặc định, lấy FormData, gọi API tương ứng, cập nhật thông báo và luôn bỏ busy. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "register") {
        await post("/auth/register", data);
        setMode("login");
        setMessage("Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.");
      } else if (mode === "login") {
        const result = await post<Login>("/auth/login", data);
        setToken(result.sessionToken);
        loggedIn(result.user);
      } else if (mode === "forgot") {
        const result = await post<{ message: string }>(
          "/auth/forgot-password",
          data,
        );
        setMessage(result.message);
      } else {
        await post("/auth/reset-password", data);
        setMode("login");
        setMessage(
          "Mật khẩu đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={labels[mode]} close={close}>
      <p className="muted">Tài khoản của bạn tại VNWatch.</p>
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <form key={mode} onSubmit={submit} className="stack">
        {mode === "register" && (
          <label>
            Họ và tên
            <input name="displayName" required minLength={2} maxLength={80} />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
        )}
        {mode === "reset" && (
          <label>
            Mã đặt lại mật khẩu
            <input name="token" required minLength={6} maxLength={128} />
          </label>
        )}
        {mode !== "forgot" && (
          <label>
            {mode === "reset" ? "Mật Khẩu Mới: " : "Mật khẩu"}
            <input
              name={mode === "reset" ? "newPassword" : "password"}
              aria-label={mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}
              aria-describedby={mode === "login" ? undefined : "password-help"}
              type="password"
              required
              minLength={mode === "login" ? 1 : 15}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            {mode !== "login" && (
              <small id="password-help">Từ 15 đến 128 ký tự.</small>
            )}
          </label>
        )}
        <button className="primary" disabled={busy}>
          {busy
            ? "Đang xử lý…"
            : mode === "forgot"
              ? "Gửi yêu cầu"
              : mode === "login"
                ? "Đăng nhập"
                : labels[mode]}
        </button>
      </form>
      <div className="auth-links">
        {mode === "login" ? (
          <>
            <button onClick={() => switchMode("register")}>
              Tạo tài khoản mới
            </button>
            <button onClick={() => switchMode("forgot")}>Quên mật khẩu?</button>
          </>
        ) : (
          <button onClick={() => switchMode("login")}>
            Quay lại đăng nhập
          </button>
        )}
        {mode === "forgot" && (
          <>
            <p className="muted small">
              Demo gửi hướng dẫn vào hộp thư cục bộ của backend, chưa gửi email
              thật. Xem hướng dẫn chạy để lấy mã.
            </p>
            <button onClick={() => switchMode("reset")}>
              Tôi đã có mã đặt lại
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Đọc hồ sơ/phiên và cung cấp sửa tên, đổi mật khẩu, thu hồi phiên. */
export function Account({
  user,
  updateUser,
  close,
  signedOut,
}: {
  // Hồ sơ/danh tính hiện tại; quan hệ DB nếu dùng trong Prisma.
  user: User;
  updateUser: (user: User) => void;
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  signedOut: () => void;
}) {
  // React state tab: Mục quản trị đang được chọn. setTab yêu cầu React render lại khi giá trị đổi.
  const [tab, setTab] = useState("profile");
  const [sessions, setSessions] = useState<Session[]>([]);
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  // React state message: Thông báo kết quả thao tác. setMessage yêu cầu React render lại khi giá trị đổi.
  const [message, setMessage] = useState("");
  // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    if (tab !== "sessions") return;
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setError("");
    api<Session[]>("/auth/sessions", { signal: controller.signal })
      .then(setSessions)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [tab, retry]);
  /** Bao thao tác bất đồng bộ để hiển thị busy/lỗi rồi tải lại dữ liệu khi thành công. */
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  /** Ngăn submit HTML mặc định, lấy FormData, gọi API tương ứng, cập nhật thông báo và luôn bỏ busy. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    void action(async () => {
      if (tab === "profile") {
        updateUser(
          await api<User>("/users/me", {
            method: "PATCH",
            body: JSON.stringify(data),
          }),
        );
        setMessage("Đã cập nhật tên hiển thị.");
      } else {
        await post("/auth/change-password", data);
        form.reset();
        signedOut();
      }
    });
  }
  return (
    <Modal title="Tài khoản của tôi" close={close} wide>
      <div className="account-summary">
        <span className="avatar">
          {user.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <strong>{user.displayName}</strong>
          <p className="muted">{user.email}</p>
        </div>
      </div>
      <div className="tabs">
        {[
          ["profile", "Hồ sơ"],
          ["password", "Mật khẩu"],
          ["sessions", "Phiên đăng nhập"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setError("");
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {tab !== "sessions" ? (
        <form onSubmit={submit} className="stack" key={tab}>
          {tab === "profile" ? (
            <>
              <label>
                Họ và tên
                <input
                  name="displayName"
                  defaultValue={user.displayName}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <label>
                Email
                <input value={user.email} disabled />
              </label>
            </>
          ) : (
            <>
              <label>
                Mật khẩu hiện tại
                <input
                  type="password"
                  name="currentPassword"
                  required
                  maxLength={128}
                  autoComplete="current-password"
                />
              </label>
              <label>
                Mật khẩu mới
                <input
                  type="password"
                  name="newPassword"
                  aria-label="Mật khẩu mới"
                  required
                  minLength={15}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <small>
                  Tối thiểu 15 ký tự. Sau khi đổi, bạn cần đăng nhập lại.
                </small>
              </label>
            </>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </form>
      ) : (
        <div className="stack">
          <button
            className="text-button"
            onClick={() => setRetry((x) => x + 1)}
            disabled={busy}
          >
            Làm mới danh sách
          </button>
          {sessions.map((s) => (
            <div className="session" key={s.id}>
              <div>
                <strong>{s.current ? "Phiên hiện tại" : "Phiên khác"}</strong>
                <p className="small muted">
                  Đăng nhập: {date(s.createdAt)}
                  <br />
                  Hết hạn: {date(s.expiresAt)}
                </p>
              </div>
              <button
                className="outline"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await api(`/auth/sessions/${s.id}`, { method: "DELETE" });
                    if (s.current) signedOut();
                    else
                      setSessions((items) =>
                        items.filter((item) => item.id !== s.id),
                      );
                  })
                }
              >
                Thu hồi
              </button>
            </div>
          ))}
          <button
            className="outline"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await post("/auth/logout-all");
                signedOut();
              })
            }
          >
            Đăng xuất tất cả thiết bị
          </button>
        </div>
      )}
      <button
        className="text-button logout"
        disabled={busy}
        onClick={() =>
          void action(async () => {
            await post("/auth/logout");
            signedOut();
          })
        }
      >
        Đăng xuất
      </button>
    </Modal>
  );
}

/** Component quản trị tài khoản cũ; không được gắn vào App cửa hàng hiện tại. */
export function Admin({
  close,
  currentUser,
  onSelfChanged,
}: {
  // Callback đóng màn hình/component; component cha quyết định state.
  close: () => void;
  currentUser: User;
  onSelfChanged: () => void;
}) {
  // React state page: Trang hiện tại; đổi bộ lọc cần quay về trang đầu. setPage yêu cầu React render lại khi giá trị đổi.
  const [page, setPage] = useState(1);
  // React state result: Trang catalog mới nhất đã tải; null khi chưa có dữ liệu. setResult yêu cầu React render lại khi giá trị đổi.
  const [result, setResult] = useState<Page<User> | null>(null);
  // React state selected: Bản ghi đang được chọn để xem/sửa. setSelected yêu cầu React render lại khi giá trị đổi.
  const [selected, setSelected] = useState<User | null>(null);
  // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
  const [error, setError] = useState("");
  // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
  const [busy, setBusy] = useState(false);
  // React state revision: Bộ đếm yêu cầu tải lại dữ liệu sau thay đổi/thử lại. setRevision yêu cầu React render lại khi giá trị đổi.
  const [revision, setRevision] = useState(0);
  // React state loading: Đang tải dữ liệu để hiển thị skeleton/thông báo. setLoading yêu cầu React render lại khi giá trị đổi.
  const [loading, setLoading] = useState(false);
  // Tải dữ liệu từ API theo dependency; kết quả cập nhật state, lỗi hiển thị và cleanup hủy lượt cũ nếu có AbortController.
  useEffect(() => {
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    setError("");
    setLoading(true);
    api<Page<User>>(`/users?page=${page}&limit=10`, {
      signal: controller.signal,
    })
      .then(setResult)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, revision]);
  /** Ngăn submit HTML mặc định, lấy FormData, gọi API tương ứng, cập nhật thông báo và luôn bỏ busy. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      await api(`/users/${selected.id}/access`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (selected.id === currentUser.id) onSelfChanged();
      setSelected(null);
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Quản lý tài khoản" close={close} wide>
      {error && <Notice error>{error}</Notice>}
      {selected ? (
        <form className="stack" onSubmit={submit} key={selected.id}>
          <p>
            Thay đổi quyền của <strong>{selected.email}</strong>. Các phiên đăng
            nhập của tài khoản này sẽ bị thu hồi.
          </p>
          <label>
            Vai trò
            <select name="role" defaultValue={selected.role}>
              <option value="CUSTOMER">Khách hàng</option>
              <option value="STAFF">Nhân viên</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </label>
          <label>
            Trạng thái
            <select name="status" defaultValue={selected.status}>
              <option value="ACTIVE">Hoạt động</option>
              <option value="BLOCKED">Bị khóa</option>
            </select>
          </label>
          <label>
            Lý do thay đổi
            <input name="reason" required minLength={5} maxLength={200} />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Xác nhận thay đổi"}
          </button>
          <button
            type="button"
            className="outline"
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            Hủy
          </button>
        </form>
      ) : (
        <>
          <div className="stack" aria-busy={loading}>
            {loading ? (
              <p>Đang tải…</p>
            ) : (
              result?.data.map((u) => (
                <div className="session" key={u.id}>
                  <div>
                    <strong>{u.displayName}</strong>
                    <p className="small muted">
                      {u.email}
                      <br />
                      {u.role} · {u.status}
                    </p>
                  </div>
                  <button className="outline" onClick={() => setSelected(u)}>
                    Sửa quyền
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="pagination">
            <button
              disabled={page <= 1 || loading}
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
    </Modal>
  );
}
