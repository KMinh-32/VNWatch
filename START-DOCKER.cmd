@echo off
rem HỌC VNWATCH: Chạy các dịch vụ Docker của VNWatch và chờ health check; dữ liệu PostgreSQL nằm trong volume.
rem Doc huong dan HOC-CODE.vi.md truoc khi chay script.
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker\setup.ps1"
if errorlevel 1 goto failed
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 180
if errorlevel 1 goto failed
echo VNWatch Docker: http://127.0.0.1:5180/
echo You can change WEB_PORT in .env.docker.
pause
exit /b 0
:failed
echo Docker could not start. Open Docker Desktop and check the error above.
pause
exit /b 1
