@echo off
rem HỌC VNWATCH: Mở file exe quản trị đã cài tại apps/VNWatchManager; báo hướng dẫn cài nếu chưa có.
rem Doc huong dan HOC-CODE.vi.md truoc khi chay script.
cd /d "%~dp0"
if not exist "%~dp0apps\VNWatchManager\VNWatch Manager.exe" goto missing
start "" "%~dp0apps\VNWatchManager\VNWatch Manager.exe"
exit /b 0
:missing
echo Install VNWatch Manager with outputs\vnwatch-manager\release\VNWatch-Manager-Setup-0.1.0.exe first.
pause
exit /b 1
