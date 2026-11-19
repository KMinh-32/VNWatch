/**
 * HỌC VNWATCH — outputs/vnwatch-frontend/vite.config.ts
 * Cấu hình dev proxy API và hai chế độ build: web dùng index.html; desktop dùng desktop.html và assets tương đối.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const proxy = {
  "/api": {
    target: process.env.VNWATCH_API_TARGET ?? "http://127.0.0.1:3000",
    changeOrigin: true,
  },
};
export default defineConfig(({ mode }) => ({
  base: mode === "desktop" ? "./" : "/",
  build:
    mode === "desktop"
      ? {
          outDir: "../vnwatch-manager/ui",
          emptyOutDir: true,
          rollupOptions: {
            input: resolve(import.meta.dirname, "desktop.html"),
          },
        }
      : undefined,
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
}));
