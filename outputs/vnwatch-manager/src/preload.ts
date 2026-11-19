/**
 * HỌC VNWATCH — outputs/vnwatch-manager/src/preload.ts
 * Cầu nối contextBridge chỉ công khai các thao tác API/status/start/cancel/openWebsite, không công khai ipcRenderer hay shell.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import { contextBridge, ipcRenderer } from "electron";
import type { ApiRequest } from "./bridge";
contextBridge.exposeInMainWorld(
  "vnwatchDesktop",
  Object.freeze({
    request: (request: ApiRequest) =>
      ipcRenderer.invoke("vnwatch:request", request),
    cancelRequest: (id: string) => ipcRenderer.send("vnwatch:cancel", id),
    serviceStatus: () => ipcRenderer.invoke("vnwatch:status"),
    startBackend: () => ipcRenderer.invoke("vnwatch:start"),
    openWebsite: () => ipcRenderer.invoke("vnwatch:website"),
  }),
);
