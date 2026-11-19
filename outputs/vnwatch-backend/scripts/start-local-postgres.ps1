# HỌC VNWATCH — outputs/vnwatch-backend/scripts/start-local-postgres.ps1
# Khởi động PostgreSQL cục bộ từ công cụ phát triển; quản lý đường dẫn, port và dữ liệu của riêng dự án.
param(
  [string]$PgBin = 'C:\Program Files\PostgreSQL\17\bin',
  [string]$DataDirectory = '',
  [int]$Port = 54329
)
# Stop biến lỗi cmdlet thành exception để catch xử lý, tránh script chạy tiếp với kết quả thiếu.
$ErrorActionPreference = 'Stop'
$vnProjectRoot = Split-Path $PSScriptRoot -Parent
if (-not $DataDirectory) { $DataDirectory = Join-Path $vnProjectRoot 'work\postgres' }
$vnDataPath = [IO.Path]::GetFullPath($DataDirectory)
$vnEnvPath = Join-Path $vnProjectRoot '.env'
if (-not (Test-Path -LiteralPath (Join-Path $PgBin 'initdb.exe'))) { throw 'PostgreSQL binaries not found. Supply -PgBin.' }
if (Test-Path -LiteralPath $vnEnvPath) {
  throw '.env already exists. This helper only bootstraps a new local environment. Preserve your file and use the manual instructions for an existing environment.'
}
if (Test-Path -LiteralPath (Join-Path $vnDataPath 'PG_VERSION')) { throw 'Existing cluster detected; refusing to reinitialize it.' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw "Port $Port is already in use." }
New-Item -ItemType Directory -Force -Path $vnDataPath | Out-Null
$vnPassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$vnPasswordFile = Join-Path (Split-Path $vnDataPath -Parent) ('vnwatch-password-' + [Guid]::NewGuid().ToString('N') + '.txt')
$vnStarted = $false
# Gom thao tác có thể lỗi; catch/finally phía sau xử lý và giải phóng tài nguyên nếu có.
try {
  [IO.File]::WriteAllText($vnPasswordFile, $vnPassword + "`n", [Text.UTF8Encoding]::new($false))
  & (Join-Path $PgBin 'initdb.exe') -D $vnDataPath -U vnwatch --auth=scram-sha-256 --encoding=UTF8 --locale=C "--pwfile=$vnPasswordFile"
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed.' }
  $vnServer = Start-Process -FilePath (Join-Path $PgBin 'postgres.exe') -ArgumentList @('-D', ('"' + $vnDataPath + '"'), '-h', '127.0.0.1', '-p', "$Port", '-c', 'timezone=UTC') -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $vnDataPath 'server.log') -RedirectStandardOutput (Join-Path $vnDataPath 'stdout.log')
  $vnStarted = $true
  $vnReady = $false
  for ($vnAttempt = 0; $vnAttempt -lt 40; $vnAttempt++) {
    if ($vnServer.HasExited) { throw 'PostgreSQL exited. Inspect server.log in the cluster directory.' }
    & (Join-Path $PgBin 'pg_isready.exe') -h 127.0.0.1 -p $Port -U vnwatch -d postgres | Out-Null
    if ($LASTEXITCODE -eq 0) { $vnReady = $true; break }
    Start-Sleep -Milliseconds 250
  }
  if (-not $vnReady) { throw 'PostgreSQL did not become ready.' }
  $env:PGPASSWORD = $vnPassword
  foreach ($vnDatabase in @('vnwatch_dev', 'vnwatch_test')) {
    & (Join-Path $PgBin 'createdb.exe') -h 127.0.0.1 -p $Port -U vnwatch $vnDatabase
    if ($LASTEXITCODE -ne 0) { throw "Could not create $vnDatabase." }
  }
  $vnEnv = @(
    'NODE_ENV=development', 'PORT=3000', 'HOST=127.0.0.1',
    "POSTGRES_PASSWORD=$vnPassword",
    "DATABASE_URL=postgresql://vnwatch:$vnPassword@127.0.0.1:$Port/vnwatch_dev?schema=public",
    "TEST_DATABASE_URL=postgresql://vnwatch:$vnPassword@127.0.0.1:$Port/vnwatch_test?schema=public"
  )
  [IO.File]::WriteAllLines($vnEnvPath, $vnEnv, [Text.UTF8Encoding]::new($false))
  Write-Output "Isolated PostgreSQL ready on 127.0.0.1:$Port. Credentials saved to ignored .env."
  Write-Output "Cluster directory: $vnDataPath"
} catch {
  if ($vnStarted) { & (Join-Path $PgBin 'pg_ctl.exe') -D $vnDataPath -m fast -w stop }
  throw
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $vnPasswordFile) { Remove-Item -LiteralPath $vnPasswordFile }
}
