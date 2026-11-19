/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/src/main.tsx
 * Điểm vào web: gắn React vào root. Đường dẫn /admin chỉ hướng dẫn mở phần mềm quản trị đã cài.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./storefront.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/^\/admin(?:\/|$)/.test(window.location.pathname) ? (
      <main className="section">
        <p className="eyebrow">VNWATCH MANAGER</p>
        <h1>Quản trị bằng ứng dụng Windows</h1>
        <p>
          Mở VNWatch Manager trên Desktop hoặc trong menu Start để quản lý cửa
          hàng.
        </p>
        <a href="/">Về cửa hàng</a>
      </main>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
