# build.ps1 — بيبني ThreePillars-IT.exe من ملفات النظام (نفس ملفات tp-it-assets)
#   powershell -ExecutionPolicy Bypass -File desktop\build.ps1
# المخرج: desktop\dist\ThreePillars-IT.exe  (+ ملف SHA256)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $PSScriptRoot 'dist'; New-Item -ItemType Directory -Force $out | Out-Null
$stage = Join-Path $PSScriptRoot 'obj'; if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }; New-Item -ItemType Directory -Force $stage | Out-Null

# 1) ملفات الويب: it.html + css + js + img (من غير config.js — البرنامج ليه config خاص)
$files = @()
$files += Get-Item (Join-Path $root 'it.html')
foreach ($d in 'css', 'js', 'img') { $files += Get-ChildItem (Join-Path $root $d) -Recurse -File }
$files = $files | Where-Object { $_.Name -ne 'config.js' }
$cfg = Join-Path $stage 'config.js'
[IO.File]::WriteAllText($cfg, "window.APP_CONFIG = { autoDemo: false, hosted: false, standalone: true, desktop: true, storageKey: 'it_assets_tp_v1' };`n", (New-Object Text.UTF8Encoding($false)))

# 2) أيقونة من img/mark.png (PNG جوه ICO)
Add-Type -AssemblyName System.Drawing
$src = [Drawing.Image]::FromFile((Join-Path $root 'img\mark.png'))
$ico = Join-Path $stage 'app.ico'; $ms = New-Object IO.MemoryStream
$bmp = New-Object Drawing.Bitmap 256, 256; $g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.Clear([Drawing.Color]::Transparent)
$r = [Math]::Min(256 / $src.Width, 256 / $src.Height); $w = [int]($src.Width * $r); $h = [int]($src.Height * $r); $g.DrawImage($src, [int]((256 - $w) / 2), [int]((256 - $h) / 2), $w, $h); $g.Dispose(); $src.Dispose()
$bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $png = $ms.ToArray()
$fs = [IO.File]::Create($ico); $bw = New-Object IO.BinaryWriter $fs
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]1); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$png.Length); $bw.Write([uint32]22); $bw.Write($png); $bw.Close()

# 3) الترجمة (csc من .NET Framework الموجود في Windows)
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$rsp = Join-Path $stage 'build.rsp'
$lines = @('/nologo', '/target:winexe', '/optimize+', '/platform:anycpu', "/out:`"$(Join-Path $out 'ThreePillars-IT.exe')`"", "/win32icon:`"$ico`"",
  '/r:System.dll', '/r:System.Management.dll', '/r:System.Windows.Forms.dll', "/resource:`"$cfg`",web/js/config.js")
foreach ($f in $files) { $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/'); $lines += "/resource:`"$($f.FullName)`",web/$rel" }
$lines += "`"$(Join-Path $PSScriptRoot 'Launcher.cs')`""
[IO.File]::WriteAllLines($rsp, $lines, (New-Object Text.UTF8Encoding($false)))
& $csc "@$rsp"; if ($LASTEXITCODE) { throw "csc failed ($LASTEXITCODE)" }
$exe = Join-Path $out 'ThreePillars-IT.exe'
$hash = (Get-FileHash $exe -Algorithm SHA256).Hash.ToLower()
"$hash  ThreePillars-IT.exe" | Set-Content (Join-Path $out 'ThreePillars-IT.exe.sha256') -Encoding ascii
Remove-Item $stage -Recurse -Force
"OK  $exe  ($([Math]::Round((Get-Item $exe).Length / 1MB, 2)) MB, $($files.Count + 1) files)  sha256 $hash"
