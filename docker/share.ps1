# HỌC VNWATCH — docker/share.ps1
# Bật/tắt tunnel chia sẻ Internet theo lệnh rõ ràng; mặc định học mã không cần bật chia sẻ.
param([switch]$Stop)
# Stop biến lỗi cmdlet thành exception để catch xử lý, tránh script chạy tiếp với kết quả thiếu.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $taskRoot

if ($Stop) {
    docker compose -f compose.share.yaml down
    if ($LASTEXITCODE -ne 0) { throw 'Could not stop sharing.' }
    Remove-Item -LiteralPath (Join-Path $taskRoot 'SHARE-LINK.txt') -ErrorAction SilentlyContinue
    Write-Host 'Sharing stopped. The local store is still available at http://127.0.0.1:5180/'
    exit 0
}

docker info --format '{{.ServerVersion}}' *> $null
if ($LASTEXITCODE -ne 0) {
    docker desktop start
    if ($LASTEXITCODE -ne 0) { throw 'Open Docker Desktop, then run SHARE-WEBSITE.cmd again.' }
}
if (!(Test-Path -LiteralPath '.env.docker')) { throw 'Run START-DOCKER.cmd first.' }

docker compose --env-file .env.docker up -d --no-build --wait --wait-timeout 180
if ($LASTEXITCODE -ne 0) { throw 'Run START-DOCKER.cmd first and check its errors.' }
docker compose -f compose.share.yaml up -d --wait share-gateway
if ($LASTEXITCODE -ne 0) { throw 'The preview gateway could not start.' }

$probe = Invoke-WebRequest -Uri 'http://127.0.0.1:5181/' -UseBasicParsing -TimeoutSec 15
if ($probe.Content -notmatch '<div role="status"') { throw 'Preview banner is missing; tunnel not started.' }
foreach ($path in @('/admin', '/api/v1/management/reports', '/api/v1/users', '/docs-json')) {
    try {
        Invoke-WebRequest -Uri ('http://127.0.0.1:5181' + $path) -UseBasicParsing -TimeoutSec 15 | Out-Null
        throw ('Private route was unexpectedly reachable: ' + $path)
    } catch {
        if (!$_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 403) { throw }
    }
}

docker compose -f compose.share.yaml up -d share-tunnel
if ($LASTEXITCODE -ne 0) { throw 'Cloudflare Tunnel could not start.' }
$taskContainer = docker compose -f compose.share.yaml ps -q share-tunnel
$taskStartedAt = docker inspect --format '{{.State.StartedAt}}' $taskContainer
if ($LASTEXITCODE -ne 0 -or !$taskStartedAt) { throw 'Could not inspect the tunnel start time.' }
$taskLink = $null
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    # Ignore links from a previous run of the same stopped container.
    $taskLogs = docker compose -f compose.share.yaml logs --no-color --since $taskStartedAt --tail 150 share-tunnel 2>&1 | Out-String
    $taskMatch = [regex]::Match($taskLogs, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($taskMatch.Success) { $taskLink = $taskMatch.Value; break }
    Start-Sleep -Seconds 2
}
if (!$taskLink) {
    docker compose -f compose.share.yaml stop share-tunnel
    throw 'No public URL was received. Check your Internet connection, then try again.'
}
Set-Content -LiteralPath (Join-Path $taskRoot 'SHARE-LINK.txt') -Value $taskLink -Encoding UTF8
Write-Host ''
Write-Host ('Send this HTTPS link to the other computer: ' + $taskLink)
Write-Host 'Public preview only: catalog and product details. Admin/login/order changes are blocked.'
Write-Host 'Keep this computer, Docker Desktop and Internet running. Stop with STOP-SHARING.cmd.'
