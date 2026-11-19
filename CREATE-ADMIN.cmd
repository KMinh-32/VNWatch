@echo off
rem HỌC VNWATCH: Lối tắt gọi PowerShell tạo admin đầu tiên trong môi trường Docker.
rem Doc huong dan HOC-CODE.vi.md truoc khi chay script.
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker\create-admin.ps1"
pause
