/**
 * HỌC VNWATCH — outputs/vnwatch-manager/src/main.ts
 * Tiến trình main của Electron: tạo cửa sổ Windows, phục vụ UI đóng gói, kiểm tra IPC và tự khởi động backend Docker.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  protocol,
  session,
  shell,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
} from "electron";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { backendOrigin, validateRequest, type ServiceStatus } from "./bridge";

const run = promisify(execFile);
const APP_ORIGIN = "vnwatch-admin://app";
// Backend test chỉ được chọn trong bản chưa đóng gói; bản cài luôn dùng origin local cố định.
const testing = !app.isPackaged && process.env.NODE_ENV === "test";
const origin = backendOrigin(
  testing ? process.env.VNWATCH_DESKTOP_TEST_ORIGIN : undefined,
);
const projectRoot = "D:\\VNWatch";
const uiRoot = path.join(app.getAppPath(), "ui");
let mainWindow: BrowserWindow | null = null;
let service: ServiceStatus = {
  state: "checking",
  message: "Đang kiểm tra kết nối dữ liệu…",
  origin,
};
let starting: Promise<ServiceStatus> | null = null;
let activeToken: string | null = null;
let quitting = false;
// Map các request đang chạy phục vụ hủy và giới hạn đồng thời; mỗi request được xóa trong finally.
const requests = new Map<string, AbortController>();

protocol.registerSchemesAsPrivileged([
  {
    scheme: "vnwatch-admin",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
app.setAppUserModelId("vnwatch.manager.desktop");
// Chỉ mở một instance; lần bấm shortcut tiếp theo tập trung vào cửa sổ đã có.
if (!testing && !app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => {
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.show();
  mainWindow?.focus();
});

/** Chỉ chấp nhận IPC từ main frame của cửa sổ riêng với protocol/path đóng gói đúng. */
function trusted(event: IpcMainEvent | IpcMainInvokeEvent): void {
  if (
    !mainWindow ||
    event.sender.id !== mainWindow.webContents.id ||
    event.senderFrame !== event.sender.mainFrame
  )
    throw new Error("Untrusted caller.");
  const frame = new URL(event.senderFrame!.url);
  if (
    frame.protocol !== "vnwatch-admin:" ||
    frame.host !== "app" ||
    !["/", "/desktop.html"].includes(frame.pathname)
  )
    throw new Error("Untrusted page.");
}
/** Gọi readiness với timeout ba giây; kết nối/lỗi JSON không hợp lệ trả false. */
async function healthy(): Promise<boolean> {
  try {
    const response = await fetch(origin + "/api/v1/health/ready", {
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
    return (
      response.ok &&
      ((await response.json()) as { status?: string }).status === "ok"
    );
  } catch {
    return false;
  }
}
/** Nếu đang khởi động giữ trạng thái hiện tại, nếu không kiểm tra lại ready/offline. */
async function checkStatus(): Promise<ServiceStatus> {
  if (starting) return service;
  service = (await healthy())
    ? { state: "ready", message: "Đã kết nối dữ liệu cửa hàng", origin }
    : {
        state: "offline",
        message: "Chưa kết nối được dữ liệu. Hãy khởi động dịch vụ.",
        origin,
      };
  return service;
}
/** Dùng một Promise chung để tránh khởi động trùng; kiểm tra Docker, chạy compose cố định rồi xác nhận readiness. */
async function startBackend(): Promise<ServiceStatus> {
  // Single flight: nhiều lần click khởi động cùng dùng Promise đang chạy, không gọi Docker compose trùng.
  if (starting) return starting;
  starting = (async () => {
    service = {
      state: "starting",
      message: "Đang khởi động dịch vụ dữ liệu…",
      origin,
    };
    try {
      if (!(await healthy())) {
        if (testing) throw new Error("Test API is offline.");
        await access(path.join(projectRoot, "compose.yaml"));
        await access(path.join(projectRoot, ".env.docker"));
        try {
          await run("docker.exe", ["info", "--format", "{{.ServerVersion}}"], {
            windowsHide: true,
            timeout: 10000,
          });
        } catch {
          await run("docker.exe", ["desktop", "start"], {
            windowsHide: true,
            timeout: 90000,
          });
        }
        // Chạy executable với mảng tham số cố định, không ghép lệnh shell từ dữ liệu renderer/user.
        await run(
          "docker.exe",
          [
            "compose",
            "--env-file",
            ".env.docker",
            "up",
            "-d",
            "--no-build",
            "--wait",
            "--wait-timeout",
            "180",
          ],
          {
            cwd: projectRoot,
            windowsHide: true,
            timeout: 240000,
            maxBuffer: 1048576,
          },
        );
        if (!(await healthy())) throw new Error("Backend is not ready.");
      }
      service = {
        state: "ready",
        message: "Đã kết nối dữ liệu cửa hàng",
        origin,
      };
    } catch {
      service = {
        state: "offline",
        message:
          "Không khởi động được dịch vụ. Kiểm tra Docker Desktop và thư mục D:\\VNWatch rồi thử lại.",
        origin,
      };
    }
    return service;
  })();
  try {
    return await starting;
  } finally {
    starting = null;
  }
}
/** Đăng ký các handler hẹp, kiểm tra caller và request, áp giới hạn/timeout, giữ token ở bộ nhớ cho logout khi đóng. */
function registerIpc(): void {
  ipcMain.handle("vnwatch:status", (event) => {
    trusted(event);
    return checkStatus();
  });
  ipcMain.handle("vnwatch:start", (event) => {
    trusted(event);
    return startBackend();
  });
  ipcMain.handle("vnwatch:website", async (event) => {
    trusted(event);
    if (!testing) await shell.openExternal("http://127.0.0.1:5180/");
  });
  ipcMain.on("vnwatch:cancel", (event, id: unknown) => {
    try {
      trusted(event);
      if (typeof id === "string") requests.get(id)?.abort();
    } catch {
      /* Ignore untrusted cancellation. */
    }
  });
  ipcMain.handle("vnwatch:request", async (event, value: unknown) => {
    trusted(event);
    // IPC là ranh giới không tin cậy: main xác thực input dù TypeScript ở React đã có kiểu.
    const request = validateRequest(value, origin);
    if (requests.has(request.id) || requests.size >= 32)
      throw new Error("Too many requests.");
    // AbortController tạo tín hiệu hủy cho lượt tải này; cleanup ngăn phản hồi cũ tiếp tục cập nhật UI.
    const controller = new AbortController();
    requests.set(request.id, controller);
    try {
      const response = await fetch(request.url, {
        method: request.method,
        body: request.body,
        redirect: "error",
        headers: {
          ...(request.body ? { "Content-Type": "application/json" } : {}),
          ...(request.authorization
            ? { Authorization: request.authorization }
            : {}),
          ...(request.idempotencyKey
            ? { "Idempotency-Key": request.idempotencyKey }
            : {}),
        },
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15000),
        ]),
      });
      const body: unknown =
        response.status === 204 ? null : await response.json();
      if (
        request.path === "/auth/admin/login" &&
        response.ok &&
        body &&
        typeof body === "object" &&
        "sessionToken" in body &&
        typeof body.sessionToken === "string"
      )
        activeToken = body.sessionToken;
      if (request.path === "/auth/logout") activeToken = null;
      return { status: response.status, body };
    } catch {
      throw new Error("Không kết nối được máy chủ.");
    } finally {
      requests.delete(request.id);
    }
  });
}
/** Tạo cửa sổ Windows sandbox/contextIsolation, gắn preload và chặn popup/navigation/webview không cho phép. */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    title: "VNWatch Manager",
    backgroundColor: "#f4f4ef",
    icon: path.join(app.getAppPath(), "build/manager.ico"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // React không được require Node, đọc file hay tự chạy shell.
      nodeIntegration: false,
      // Tách thế giới preload đặc quyền khỏi JavaScript giao diện; chỉ API contextBridge được dùng.
      contextIsolation: true,
      // Renderer chạy sandbox; quyền OS nằm ở main với các handler đã kiểm tra.
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.webContents.on("will-attach-webview", (event) =>
    event.preventDefault(),
  );
  mainWindow.webContents.on(
    "did-start-navigation",
    (_event, _url, inPlace, isMainFrame) => {
      if (isMainFrame && !inPlace)
        for (const controller of requests.values()) controller.abort();
    },
  );
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
    for (const controller of requests.values()) controller.abort();
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Tệp",
        submenu: [
          {
            label: "Xem cửa hàng",
            click: () => {
              if (!testing) void shell.openExternal("http://127.0.0.1:5180/");
            },
          },
          { type: "separator" },
          { label: "Đóng ứng dụng", role: "quit" },
        ],
      },
      {
        label: "Chỉnh sửa",
        submenu: [
          { role: "undo", label: "Hoàn tác" },
          { role: "redo", label: "Làm lại" },
          { type: "separator" },
          { role: "cut", label: "Cắt" },
          { role: "copy", label: "Sao chép" },
          { role: "paste", label: "Dán" },
          { role: "selectAll", label: "Chọn tất cả" },
        ],
      },
      {
        label: "Hiển thị",
        submenu: [
          { role: "reload", label: "Tải lại giao diện" },
          { role: "resetZoom", label: "Kích thước mặc định" },
          { role: "zoomIn", label: "Phóng to" },
          { role: "zoomOut", label: "Thu nhỏ" },
          { role: "togglefullscreen", label: "Toàn màn hình" },
        ],
      },
      {
        label: "Trợ giúp",
        submenu: [
          {
            label: "Giới thiệu VNWatch Manager",
            click: () => {
              if (mainWindow)
                void dialog.showMessageBox(mainWindow, {
                  type: "info",
                  title: "VNWatch Manager",
                  message: "VNWatch Manager " + app.getVersion(),
                  detail:
                    "Ứng dụng Windows quản lý sản phẩm, đơn hàng và tài khoản VNWatch.\nDữ liệu được lưu ở backend Docker trong D:\\VNWatch.",
                });
            },
          },
        ],
      },
    ]),
  );
  void mainWindow.loadURL(APP_ORIGIN + "/");
}
void app
  .whenReady()
  .then(async () => {
    const csp =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";
    // Protocol chỉ phục vụ desktop.html/assets đã đóng gói và trả CSP; không tải trang /admin của web.
    protocol.handle("vnwatch-admin", async (request) => {
      const url = new URL(request.url);
      const file =
        url.pathname === "/" ? "desktop.html" : url.pathname.slice(1);
      if (
        url.host !== "app" ||
        !["GET", "HEAD"].includes(request.method) ||
        !(file === "desktop.html" || /^assets\/[a-zA-Z0-9._-]+$/.test(file))
      )
        return new Response("Not found", { status: 404 });
      try {
        const bytes = await readFile(path.join(uiRoot, file));
        const type: Record<string, string> = {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
        };
        return new Response(
          request.method === "HEAD" ? null : new Uint8Array(bytes),
          {
            headers: {
              "Content-Type":
                type[path.extname(file)] ?? "application/octet-stream",
              "Content-Security-Policy": csp,
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      } catch {
        return new Response("Not found", { status: 404 });
      }
    });
    session.defaultSession.setPermissionRequestHandler(
      (_wc, _permission, callback) => callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.on("will-download", (event, item) => {
      if (
        !item.getURL().startsWith("blob:" + APP_ORIGIN + "/") ||
        !item.getFilename().endsWith(".csv")
      ) {
        event.preventDefault();
        return;
      }
      item.setSaveDialogOptions({
        title: "Lưu báo cáo VNWatch",
        filters: [{ name: "Báo cáo CSV", extensions: ["csv"] }],
      });
    });
    registerIpc();
    createWindow();
    void startBackend();
  })
  .catch(() => {
    dialog.showErrorBox(
      "VNWatch Manager",
      "Không mở được ứng dụng. Hãy cài lại bộ cài hoặc xem DESKTOP.vi.md.",
    );
    app.quit();
  });
app.on("window-all-closed", () => app.quit());
app.on("before-quit", (event) => {
  // Khi đóng app, cố thu hồi phiên admin trong hai giây; không tắt Docker/database của cửa hàng.
  if (!activeToken || quitting) return;
  event.preventDefault();
  quitting = true;
  const token = activeToken;
  activeToken = null;
  void fetch(origin + "/api/v1/auth/logout", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    redirect: "error",
    signal: AbortSignal.timeout(2000),
  })
    .catch(() => undefined)
    .finally(() => app.quit());
});
