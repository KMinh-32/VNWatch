# HỌC VNWATCH — outputs/vnwatch-agent/setup.ps1
# Tạo virtualenv của agent, cài dependency đã khóa và chuẩn bị file môi trường mẫu nếu cần.
param([string]$Python = 'python')
# Stop biến lỗi cmdlet thành exception để catch xử lý, tránh script chạy tiếp với kết quả thiếu.
$ErrorActionPreference = 'Stop'
$agentRoot = $PSScriptRoot
$backendRoot = Join-Path $agentRoot '..\vnwatch-backend'
& $Python -m venv (Join-Path $agentRoot '.venv')
if ($LASTEXITCODE -ne 0) { throw 'Python 3.12+ with venv is required.' }
$venvPython = Join-Path $agentRoot '.venv\Scripts\python.exe'
& $venvPython -m pip install -r (Join-Path $agentRoot 'requirements.lock.txt')
if ($LASTEXITCODE -ne 0) { throw 'Installing agent dependencies failed.' }
$backendEnv = Join-Path $backendRoot '.env'
if (!(Test-Path -LiteralPath $backendEnv)) { throw 'Configure vnwatch-backend/.env first.' }
# Generate a shared local token without printing it or replacing an existing provider key.
$backendText = [IO.File]::ReadAllText($backendEnv)
$match = [regex]::Match($backendText, '(?m)^ASSISTANT_SERVICE_TOKEN=([^\r\n]+)')
if ($match.Success -and $match.Groups[1].Value.Length -ge 32) {
    $serviceToken = $match.Groups[1].Value
} else {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    $serviceToken = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}
$backendText = [regex]::Replace($backendText, '(?m)^ASSISTANT_SERVICE_(URL|TOKEN)=.*\r?\n?', '').TrimEnd()
[IO.File]::WriteAllText($backendEnv, $backendText + "`nASSISTANT_SERVICE_URL=http://127.0.0.1:8000`nASSISTANT_SERVICE_TOKEN=$serviceToken`n")
$agentEnv = Join-Path $agentRoot '.env'
$agentText = if (Test-Path -LiteralPath $agentEnv) { [IO.File]::ReadAllText($agentEnv) } else { "OPENAI_API_KEY=`nOPENAI_MODEL=gpt-5.4-mini`n" }
$agentText = [regex]::Replace($agentText, '(?m)^ASSISTANT_SERVICE_TOKEN=.*\r?\n?', '').TrimEnd()
[IO.File]::WriteAllText($agentEnv, $agentText + "`nASSISTANT_SERVICE_TOKEN=$serviceToken`n")
Write-Host 'Agent configured. Add OPENAI_API_KEY in vnwatch-agent/.env to enable OpenAI, or leave it empty for catalog mode.'
Write-Host 'Restart running VNWatch services after changing their .env files.'
