@echo off
rem HỌC VNWATCH: Lối tắt bật chia sẻ website qua Internet; không liên quan đến mở app quản trị cục bộ.
rem Doc huong dan HOC-CODE.vi.md truoc khi chay script.
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker\share.ps1"
pause
