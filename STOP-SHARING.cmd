@echo off
rem HỌC VNWATCH: Lối tắt dừng tunnel chia sẻ Internet, giữ các dịch vụ cửa hàng local.
rem Doc huong dan HOC-CODE.vi.md truoc khi chay script.
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker\share.ps1" -Stop
pause
