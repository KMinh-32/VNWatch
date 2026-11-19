# HỌC VNWATCH — docker/setup.ps1
# Tạo cấu hình Docker cục bộ với secret ngẫu nhiên khi chưa có; không ghi đè cấu hình đã dùng.
# Stop biến lỗi cmdlet thành exception để catch xử lý, tránh script chạy tiếp với kết quả thiếu.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$config = Join-Path $root '.env.docker'
if (Test-Path -LiteralPath $config) {
    Write-Host 'Docker configuration already exists; secrets preserved.'
    exit 0
}
# Hàm PowerShell gom một thao tác để các lệnh phía dưới gọi lại; đọc param để biết đầu vào.
function New-DemoSecret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([System.BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$lines = @(
    '# Local Docker demo. Do not commit this file.'
    "POSTGRES_PASSWORD=$(New-DemoSecret)"
    "ASSISTANT_SERVICE_TOKEN=$(New-DemoSecret)"
    'WEB_PORT=5180'
    'OPENAI_API_KEY='
    'OPENAI_MODEL=gpt-5.4-mini'
)
$encoding = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($config, $lines, $encoding)
Write-Host 'Created .env.docker with new secrets. Existing Windows configuration was preserved.'
