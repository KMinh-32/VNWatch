@echo off
rem HỌC VNWATCH: Lối tắt Windows gọi script khởi động demo local; giữ cửa sổ để đọc lỗi nếu khởi động thất bại.
rem Doc huong dan HOC-CODE.vi.md truoc khi chay script.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0outputs\start-vnwatch.ps1"
if errorlevel 1 (
  echo VNWatch could not start. Check work\demo-logs.
  pause
)
