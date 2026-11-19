/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/desktop.tsx
 * Điểm vào React của app Windows: theo dõi backend, cho khởi động lại dịch vụ và chỉ bật đăng nhập khi dữ liệu sẵn sàng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import AdminPortal from "./AdminPortal";
import "./styles.css";
/** Theo dõi trạng thái dịch vụ qua bridge; chỉ bật AdminPortal khi backend ready. */
function DesktopRoot() {
  // React state service: Trạng thái kết nối dịch vụ của app Windows. setService yêu cầu React render lại khi giá trị đổi.
  const [service, setService] = useState<DesktopServiceStatus>({
    state: "checking",
    message: "Đang kiểm tra kết nối dữ liệu…",
    origin: "",
  });
  // Đồng bộ tác vụ ngoài render với state/props; dependency bên dưới quyết định lúc effect chạy lại. Mảng []: chạy khi mount, cleanup khi unmount.
  useEffect(() => {
    let alive = true;
    /** Đọc trạng thái mới từ Electron và cập nhật UI nếu component còn hoạt động. */
    const update = () =>
      window.vnwatchDesktop
        ?.serviceStatus()
        .then((s) => {
          if (alive) setService(s);
        })
        .catch(() => {
          if (alive)
            setService({
              state: "offline",
              message: "Không kết nối được dịch vụ dữ liệu.",
              origin: "",
            });
        });
    void update();
    const timer = setInterval(update, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <>
      <div className={"desktop-servicebar " + service.state} role="status">
        <strong>
          VNWatch Manager <span>· Ứng dụng Windows</span>
        </strong>
        <span>{service.message}</span>
        {service.state === "offline" && (
          <button
            onClick={() => {
              setService((s) => ({
                ...s,
                state: "starting",
                message: "Đang khởi động dịch vụ dữ liệu…",
              }));
              void window.vnwatchDesktop?.startBackend().then(setService);
            }}
          >
            Khởi động dịch vụ
          </button>
        )}
      </div>
      <AdminPortal backendAvailable={service.state === "ready"} />
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DesktopRoot />
  </React.StrictMode>,
);
