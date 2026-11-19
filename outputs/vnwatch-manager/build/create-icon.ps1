# HỌC VNWATCH — outputs/vnwatch-manager/build/create-icon.ps1
# Dùng System.Drawing vẽ icon đồng hồ và ghi PNG/ICO phục vụ đóng gói ứng dụng Windows.
# Stop biến lỗi cmdlet thành exception để catch xử lý, tránh script chạy tiếp với kết quả thiếu.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskIconRoot = $PSScriptRoot
$taskBitmap = New-Object Drawing.Bitmap 256,256
$taskGraphics = [Drawing.Graphics]::FromImage($taskBitmap)
$taskGraphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$taskGraphics.Clear([Drawing.Color]::FromArgb(23,60,50))
$taskGold = New-Object Drawing.Pen ([Drawing.Color]::FromArgb(190,161,108)),7
$taskWhite = New-Object Drawing.Pen ([Drawing.Color]::FromArgb(250,249,242)),9
$taskGraphics.DrawEllipse($taskGold,54,30,148,148)
$taskGraphics.DrawLine($taskWhite,128,104,94,70)
$taskGraphics.DrawLine($taskWhite,128,104,171,78)
$taskGraphics.FillEllipse([Drawing.Brushes]::White,122,98,12,12)
$taskFont = New-Object Drawing.Font 'Segoe UI',30,([Drawing.FontStyle]::Bold)
$taskBrush = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(190,161,108))
$taskGraphics.DrawString('VW',$taskFont,$taskBrush,79,182)
$taskPng = New-Object IO.MemoryStream
$taskBitmap.Save($taskPng,[Drawing.Imaging.ImageFormat]::Png)
$taskBytes = $taskPng.ToArray()
[IO.File]::WriteAllBytes((Join-Path $taskIconRoot 'manager.png'),$taskBytes)
$taskIco = New-Object IO.MemoryStream
$taskWriter = New-Object IO.BinaryWriter $taskIco
$taskWriter.Write([UInt16]0); $taskWriter.Write([UInt16]1); $taskWriter.Write([UInt16]1)
$taskWriter.Write([byte]0); $taskWriter.Write([byte]0); $taskWriter.Write([byte]0); $taskWriter.Write([byte]0)
$taskWriter.Write([UInt16]1); $taskWriter.Write([UInt16]32); $taskWriter.Write([UInt32]$taskBytes.Length); $taskWriter.Write([UInt32]22)
$taskWriter.Write($taskBytes)
[IO.File]::WriteAllBytes((Join-Path $taskIconRoot 'manager.ico'),$taskIco.ToArray())
$taskWriter.Dispose(); $taskIco.Dispose(); $taskPng.Dispose()
$taskBrush.Dispose(); $taskFont.Dispose(); $taskWhite.Dispose(); $taskGold.Dispose(); $taskGraphics.Dispose(); $taskBitmap.Dispose()
Write-Host 'VNWatch Manager icon generated.'
