# HỌC VNWATCH — outputs/start-vnwatch.ps1
# Khởi động các tiến trình demo cục bộ và lưu PID/log vào thư mục work để theo dõi.
param(
    [string]$PgBin = 'C:\Program Files\PostgreSQL\17\bin',
    [string]$DataDirectory = (Join-Path $PSScriptRoot '..\work\postgres-catalog')
)
# Stop biến lỗi cmdlet thành exception để catch xử lý, tránh script chạy tiếp với kết quả thiếu.
$ErrorActionPreference = 'Stop'
$backend = Join-Path $PSScriptRoot 'vnwatch-backend'
$frontend = Join-Path $PSScriptRoot 'vnwatch-frontend'
$agent = Join-Path $PSScriptRoot 'vnwatch-agent'
$logs = Join-Path $PSScriptRoot '..\work\demo-logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$logs = (Resolve-Path -LiteralPath $logs).Path
$node = (Get-Command node.exe -ErrorAction Stop).Source

# Hàm PowerShell gom một thao tác để các lệnh phía dưới gọi lại; đọc param để biết đầu vào.
function Test-Api {
    try { return (Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/health/ready' -TimeoutSec 2).status -eq 'ok' }
    catch { return $false }
}
# Hàm PowerShell gom một thao tác để các lệnh phía dưới gọi lại; đọc param để biết đầu vào.
function Test-Frontend {
    try { return (Invoke-WebRequest 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2).Content -match '<title>VNWatch' }
    catch { return $false }
}
# Hàm PowerShell gom một thao tác để các lệnh phía dưới gọi lại; đọc param để biết đầu vào.
function Test-Agent {
    try { return (Invoke-RestMethod 'http://127.0.0.1:8000/health' -TimeoutSec 2).status -eq 'ok' }
    catch { return $false }
}
# Hàm PowerShell gom một thao tác để các lệnh phía dưới gọi lại; đọc param để biết đầu vào.
function Wait-Ready([scriptblock]$Check, [string]$Name) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (& $Check) { return }
        Start-Sleep -Milliseconds 500
    }
    throw "$Name is not ready. Inspect logs in $logs."
}

if (!(Test-Agent)) {
    $agentPython = Join-Path $agent '.venv\Scripts\python.exe'
    if ((Test-Path -LiteralPath $agentPython) -and (Test-Path -LiteralPath (Join-Path $agent '.env'))) {
        Start-Process -FilePath $agentPython -ArgumentList @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000', '--no-access-log') -WorkingDirectory $agent -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'agent.log') -RedirectStandardError (Join-Path $logs 'agent-error.log')
        Wait-Ready { Test-Agent } 'Customer consultant'
    } else {
        Write-Warning 'Customer consultant is not configured. See vnwatch-agent/README.vi.md. The storefront remains available.'
    }
}

if (!(Test-Api)) {
    if (!(Test-Path -LiteralPath (Join-Path $backend '.env'))) { throw 'Configure the backend .env first. See the backend runbook.' }
    if (!(Test-Path -LiteralPath (Join-Path $backend 'dist\main.js'))) { throw 'Build the backend with npm run build first.' }
    $pgReady = Join-Path $PgBin 'pg_isready.exe'
    if (!(Test-Path -LiteralPath $pgReady)) { throw 'PostgreSQL 17 tools not found. Pass -PgBin or start your configured database manually.' }
    & $pgReady -h 127.0.0.1 -p 54329 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        $data = (Resolve-Path -LiteralPath $DataDirectory).Path
        if (!(Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) { throw 'Existing VNWatch PostgreSQL cluster not found. Follow the backend runbook.' }
        Start-Process -FilePath (Join-Path $PgBin 'postgres.exe') -ArgumentList @('-D', ('"' + $data + '"'), '-h', '127.0.0.1', '-p', '54329', '-c', 'timezone=UTC') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'postgres.log') -RedirectStandardError (Join-Path $logs 'postgres-error.log')
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            & $pgReady -h 127.0.0.1 -p 54329 | Out-Null
            if ($LASTEXITCODE -eq 0) { $ready = $true; break }
            Start-Sleep -Milliseconds 500
        }
        if (!$ready) { throw "PostgreSQL did not start. Inspect $logs." }
    }
    Push-Location -LiteralPath $backend
    try {
        & $node 'node_modules/prisma/build/index.js' migrate deploy
        if ($LASTEXITCODE -ne 0) { throw 'Database migration failed; backend was not started.' }
    } finally {
        Pop-Location
    }
    Start-Process -FilePath $node -ArgumentList 'dist/main.js' -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'backend.log') -RedirectStandardError (Join-Path $logs 'backend-error.log')
    Wait-Ready { Test-Api } 'Backend'
}

if (!(Test-Frontend)) {
    if (!(Test-Path -LiteralPath (Join-Path $frontend 'dist\index.html'))) { throw 'Run npm ci and npm run build in vnwatch-frontend first.' }
    Start-Process -FilePath $node -ArgumentList @('node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5173', '--configLoader', 'native') -WorkingDirectory $frontend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'frontend.log') -RedirectStandardError (Join-Path $logs 'frontend-error.log')
    Wait-Ready { Test-Frontend } 'Frontend'
}
Write-Host 'VNWatch website: http://127.0.0.1:5173' -ForegroundColor Green
Write-Host 'API documentation: http://127.0.0.1:3000/docs'
if (Test-Agent) { Write-Host 'Customer consultant: http://127.0.0.1:8000/health (server only)' }
Write-Host "Background service logs: $logs"
