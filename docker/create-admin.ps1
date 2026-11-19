# HỌC VNWATCH — docker/create-admin.ps1
# Wrapper PowerShell nhận thông tin admin rồi chạy CLI backend trong Docker; không in mật khẩu ra màn hình.
# Stop biến lỗi cmdlet thành exception để catch xử lý, tránh script chạy tiếp với kết quả thiếu.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding
Write-Host 'Tao tai khoan ADMIN dau tien. Mat khau khong hien thi, khong luu vao file.'
$email = Read-Host 'Email'
$displayName = Read-Host 'Ten hien thi (2-80 ky tu)'
$secret = Read-Host 'Mat khau (15-128 ky tu)' -AsSecureString
$confirm = Read-Host 'Nhap lai mat khau' -AsSecureString
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
$confirmPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirm)
# Gom thao tác có thể lỗi; catch/finally phía sau xử lý và giải phóng tài nguyên nếu có.
try {
  $passwordText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
  $confirmText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPtr)
  if ($passwordText -cne $confirmText) { throw 'Hai mat khau khong trung nhau.' }
  if ($passwordText.Length -lt 15 -or $passwordText.Length -gt 128) { throw 'Mat khau can 15-128 ky tu.' }
  if (!(Test-Path -LiteralPath '.env.docker')) { throw 'Chay START-DOCKER.cmd truoc.' }
  $payload = @{ email=$email.Trim().ToLowerInvariant(); displayName=$displayName.Trim(); password=$passwordText } | ConvertTo-Json -Compress
  $payload | & docker compose --env-file .env.docker --profile admin run --rm -T admin-bootstrap
  if ($LASTEXITCODE -ne 0) { throw 'Tao admin that bai; xem thong bao ben tren.' }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPtr)
  $passwordText=$null; $confirmText=$null; $payload=$null
  $secret.Dispose(); $confirm.Dispose()
}
