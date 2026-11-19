/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/playwright.config.ts
 * Cấu hình kiểm thử giao diện: một worker, địa chỉ web, trình duyệt, viewport và server preview.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.VNWATCH_WEB_URL ?? "http://127.0.0.1:5173",
    channel: "msedge",
    launchOptions: process.env.VNWATCH_EDGE_PATH
      ? { executablePath: process.env.VNWATCH_EDGE_PATH }
      : undefined,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  reporter: "list",
  webServer: {
    command: "npm run preview -- --port 5173",
    url: process.env.VNWATCH_WEB_URL ?? "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
});
