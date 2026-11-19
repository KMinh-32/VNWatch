# HỌC VNWATCH — docker/import-snapshot.ps1
# Nhập bản sao dữ liệu vào PostgreSQL Docker. Đây là thao tác phục hồi dữ liệu, không cần chạy để đọc code.
param([Parameter(Mandatory = $true)][string]$Archive)
# Stop biến lỗi cmdlet thành exception để catch xử lý, tránh script chạy tiếp với kết quả thiếu.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$archivePath = (Resolve-Path -LiteralPath $Archive).Path
$compose = @('compose', '--project-directory', $root, '-f', (Join-Path $root 'compose.yaml'), '--env-file', (Join-Path $root '.env.docker'))
& docker @compose up -d db --wait --wait-timeout 120
if ($LASTEXITCODE -ne 0) { throw 'Docker database is unavailable.' }
$running = & docker @compose ps --status running --services
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Docker services.' }
if ($running | Where-Object { $_ -in @('backend', 'frontend', 'init') }) {
    throw 'Stop application services before import. This helper is for the first import into an empty Docker database.'
}
$count = & docker @compose exec -T db psql -U vnwatch -d vnwatch_dev -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public';"
if ($LASTEXITCODE -ne 0 -or $count.Trim() -ne '0') {
    throw 'Import refused: Docker already contains tables. Existing data was preserved.'
}
$id = & docker @compose ps -q db
& docker cp $archivePath "${id}:/tmp/vnwatch-import.dump"
if ($LASTEXITCODE -ne 0) { throw 'Archive copy failed.' }
# RESTRICT is intentional: this cannot delete objects in a nonempty schema.
& docker @compose exec -T db psql -U vnwatch -d vnwatch_dev -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS public;'
if ($LASTEXITCODE -ne 0) { throw 'Empty schema preparation failed.' }
& docker @compose exec -T db pg_restore -U vnwatch -d vnwatch_dev --no-owner --no-acl --single-transaction --exit-on-error /tmp/vnwatch-import.dump
if ($LASTEXITCODE -ne 0) { throw 'Archive import failed; restore transaction was rolled back.' }
Write-Host 'Snapshot imported. Start the application with START-DOCKER.cmd.'
