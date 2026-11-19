/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/AdminPortal.tsx
 * Giao diện quản trị dùng trong app Windows: đăng nhập ADMIN, điều hướng theo hash và gắn các màn hình quản lý.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { post, setToken } from "./api";
import type { Login, User } from "./types";
import { Management } from "./Management";
import { Orders } from "./Orders";
import { Support } from "./Shopping";
import { AdminUsers } from "./AdminUsers";
import { Notice } from "./components";
import type { AdminNavigate } from "./adminNavigation";
import "./admin.css";

const sections = [
  ["reports", "Tổng quan", "01"],
  ["products", "Sản phẩm & kho", "02"],
  ["orders", "Đơn hàng", "03"],
  ["users", "Tài khoản", "04"],
  ["promotions", "Khuyến mãi", "05"],
  ["support", "Hỗ trợ khách hàng", "06"],
  ["reviews", "Đánh giá", "07"],
  ["audit", "Nhật ký hoạt động", "08"],
] as const;
/** Quản lý đăng nhập ADMIN và route/hash; render đúng chức năng theo menu hoặc ô thống kê. */
export default function AdminPortal({
  backendAvailable = true,
}: {
  // Backend đang ready để cho phép gửi đăng nhập. Dấu ? cho phép thiếu trường trong kiểu TypeScript.
  backendAvailable?: boolean;
}) {
  // React state user: Hồ sơ đăng nhập hiện tại; null là chưa đăng nhập. setUser yêu cầu React render lại khi giá trị đổi.
  const [user, setUser] = useState<User | null>(null);
  // React state route: Hash quản trị hiện tại, chứa màn hình và bộ lọc. setRoute yêu cầu React render lại khi giá trị đổi.
  const [route, setRoute] = useState(() => location.hash);
  // useRef giữ giá trị/DOM giữa các lần render; đổi .current không tự làm component render lại.
  const heading = useRef<HTMLHeadingElement>(null);
  const [routeSection, query = ""] = route.replace(/^#/, "").split("?");
  const section = sections.some((s) => s[0] === routeSection)
    ? routeSection
    : "reports";
  const params = new URLSearchParams(query);
  /** Mã hóa filters vào hash và lưu history để menu, ô thống kê, Back/Forward cùng hoạt động. */
  const navigate: AdminNavigate = (next, filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    const hash = "#" + next + (query ? "?" + query : "");
    if (location.hash !== hash) {
      // Give the initial overview its own history entry before leaving it.
      if (!location.hash) history.replaceState(null, "", "#reports");
      history.pushState(null, "", hash);
    }
    setRoute(hash);
  };
  // Đăng ký sự kiện khi component tồn tại; cleanup removeEventListener để tránh handler trùng sau render/mount lại. Mảng []: chạy khi mount, cleanup khi unmount.
  useEffect(() => {
    /** Đọc lại hash khi URL hoặc lịch sử thay đổi. */
    const sync = () => setRoute(location.hash);
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  // Đưa focus/cuộn về mục vừa mở để điều hướng bằng click, Back/Forward và bàn phím có cùng kết quả.
  useEffect(() => {
    if (user) {
      heading.current?.focus({ preventScroll: true });
      heading.current
        ?.closest(".admin-topbar")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [route, user]);
  // React state busy: Đang thực hiện thao tác để vô hiệu nút gửi lặp. setBusy yêu cầu React render lại khi giá trị đổi.
  const [busy, setBusy] = useState(false),
    // React state error: Thông báo lỗi đang hiển thị; rỗng là không có lỗi. setError yêu cầu React render lại khi giá trị đổi.
    [error, setError] = useState("");
  /** Xóa token/user giao diện; giữ pending request theo admin để phục hồi kết quả chưa rõ. */
  const signOut = () => {
    setToken(null);
    setUser(null);
    setError("");
    // Pending requests remain scoped to their admin so an unknown result can be retried safely.
  };
  // Đăng ký sự kiện khi component tồn tại; cleanup removeEventListener để tránh handler trùng sau render/mount lại. Mảng []: chạy khi mount, cleanup khi unmount.
  useEffect(() => {
    /** Xóa phiên quản trị và thông báo đăng nhập lại khi token hết hạn/quyền đã đổi. */
    const expire = () => {
      signOut();
      setError(
        "Phiên quản trị đã hết hạn hoặc quyền đã thay đổi. Hãy đăng nhập lại.",
      );
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  /** Chỉ gửi đăng nhập khi backend sẵn sàng, gọi admin-login và kiểm tra role trước khi nhận phiên. */
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (!backendAvailable) {
      setBusy(false);
      return;
    }
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await post<Login>("/auth/admin/login", body);
      if (result.user.role !== "ADMIN")
        throw new Error("Tài khoản không có quyền quản trị.");
      setToken(result.sessionToken);
      setUser(result.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  /** Thu hồi token trên server rồi xóa phiên giao diện khi thành công. */
  async function logout() {
    setBusy(true);
    try {
      await post("/auth/logout");
      signOut();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className="admin-login">
        <div className="admin-login-brand">
          <a
            href="/"
            onClick={(e) => {
              if (window.vnwatchDesktop) {
                e.preventDefault();
                void window.vnwatchDesktop.openWebsite();
              }
            }}
          >
            VNWATCH<span>.</span>
          </a>
          <p>Không gian vận hành cửa hàng</p>
          <h1>
            Mọi hoạt động.
            <br />
            Một nơi quản lý.
          </h1>
          <div className="admin-brand-rule" />
          <p>Sản phẩm · Đơn hàng · Tài khoản</p>
          <small>Chỉ dành cho quản trị viên được cấp quyền.</small>
        </div>
        <main className="admin-login-card">
          <p className="eyebrow">VNWATCH / ADMIN</p>
          <h2>Đăng nhập quản trị</h2>
          <p className="muted">Sử dụng tài khoản ADMIN đang hoạt động.</p>
          {error && <Notice error>{error}</Notice>}
          <form className="stack" onSubmit={login}>
            <label>
              Email quản trị
              <input
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={1}
                maxLength={128}
                required
              />
            </label>
            <button className="primary" disabled={busy || !backendAvailable}>
              {busy ? "Đang kiểm tra…" : "Đăng nhập quản trị"}
            </button>
          </form>
          <p className="small muted">
            Chưa có admin? Chạy CREATE-ADMIN.cmd trong thư mục dự án để tạo tài
            khoản đầu tiên bằng mật khẩu của bạn.
          </p>
          <a
            className="admin-store-link"
            href="/"
            onClick={(e) => {
              if (window.vnwatchDesktop) {
                e.preventDefault();
                void window.vnwatchDesktop.openWebsite();
              }
            }}
          >
            ← Về cửa hàng
          </a>
        </main>
      </div>
    );
  const label = sections.find((s) => s[0] === section)?.[1] ?? "Tổng quan";
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a
          href="#reports"
          onClick={(e) => {
            e.preventDefault();
            navigate("reports");
          }}
          className="admin-logo"
        >
          VNWATCH<span>.</span>
        </a>
        <p className="admin-sidebar-caption">ĐIỀU HÀNH CỬA HÀNG</p>
        <nav aria-label="Quản trị">
          {sections.map(([key, label, index]) => (
            <button
              key={key}
              className={section === key ? "active" : ""}
              aria-current={section === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <span>{index}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <p>{user.displayName}</p>
          <small>Quản trị viên</small>
          <a
            href="/"
            onClick={(e) => {
              if (window.vnwatchDesktop) {
                e.preventDefault();
                void window.vnwatchDesktop.openWebsite();
              }
            }}
          >
            Xem website ↗
          </a>
          <button disabled={busy} onClick={() => void logout()}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">VNWATCH / QUẢN TRỊ</p>
            <h1 ref={heading} tabIndex={-1}>
              {label}
            </h1>
          </div>
          <span className="admin-access-badge">ADMIN · {user.displayName}</span>
        </header>
        {error && <Notice error>{error}</Notice>}
        {section === "orders" ? (
          <Orders
            key={route}
            initialFilters={{
              status: [
                "PENDING",
                "CONFIRMED",
                "COMPLETED",
                "CANCELLED",
              ].includes(params.get("status") ?? "")
                ? params.get("status")!
                : "",
              paymentStatus: ["PAID", "UNPAID"].includes(
                params.get("paymentStatus") ?? "",
              )
                ? params.get("paymentStatus")!
                : "",
              archive: ["active", "archived", "all"].includes(
                params.get("archive") ?? "",
              )
                ? params.get("archive")!
                : "active",
            }}
            user={user}
            management
            embedded
            close={() => navigate("reports")}
            resume={() => {}}
          />
        ) : section === "users" ? (
          <AdminUsers
            key={route}
            currentUser={user}
            selfChanged={signOut}
            initialRole={params.get("role") === "CUSTOMER" ? "CUSTOMER" : ""}
          />
        ) : section === "support" ? (
          <Support
            key={route}
            initialState={params.get("state") === "open" ? "open" : "all"}
            management
            embedded
            close={() => navigate("reports")}
          />
        ) : (
          <Management
            key={route}
            onNavigate={navigate}
            initialStockView={params.get("view") === "stock"}
            admin
            embedded
            initialTab={section}
            close={() => navigate("reports")}
          />
        )}
        <footer className="admin-footer">
          VNWatch · Không gian quản trị · Thay đổi được ghi nhật ký
        </footer>
      </main>
    </div>
  );
}
