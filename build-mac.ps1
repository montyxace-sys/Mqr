# Genera ZIPs de macOS sin firmar desde Windows, a partir de los binarios oficiales de Electron.
# Electron Builder solo soporta macOS en macOS; este script monta el bundle manualmente.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

$version = '1.1.0'
$electron = '33.4.11'
$work = Join-Path $env:TEMP 'mqr-mac-build'
$cache = Join-Path (Get-Location) '.cache'
$stage = Join-Path $work 'stage'
$asarOut = Join-Path $work 'app.asar'

if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null
New-Item -ItemType Directory -Path $cache -Force | Out-Null

Copy-Item package.json (Join-Path $stage 'package.json') -Force
Copy-Item desktop (Join-Path $stage 'desktop') -Recurse -Force
Copy-Item app (Join-Path $stage 'app') -Recurse -Force

Write-Host 'Empaquetando app.asar...' -ForegroundColor Cyan
node node_modules\@electron\asar\bin\asar.js pack $stage $asarOut
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear app.asar' }

foreach ($arch in @('x64', 'arm64')) {
    $zip = Join-Path $cache "electron-$arch.zip"
    $extract = Join-Path $work "electron-$arch"
    $url = "https://github.com/electron/electron/releases/download/v$electron/electron-v$electron-darwin-$arch.zip"
    Write-Host "Descargando Electron macOS $arch..." -ForegroundColor Cyan
    if (-not (Test-Path $zip)) {
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    }
    New-Item -ItemType Directory -Path $extract -Force | Out-Null
    Write-Host "Extrayendo $arch..." -ForegroundColor Cyan
    python extract_mac_zip.py $zip $extract
    if ($LASTEXITCODE -ne 0) { throw "No se pudo extraer Electron $arch" }

    $bundle = Get-ChildItem $extract -Directory -Recurse -Filter 'Electron.app' | Select-Object -First 1
    if ($null -eq $bundle) { throw "No se encontró Electron.app para $arch" }
    $resources = Join-Path $bundle.FullName 'Contents\Resources'
    $defaultAsar = Join-Path $resources 'default_app.asar'
    if (Test-Path $defaultAsar) { Remove-Item $defaultAsar -Force }
    Copy-Item $asarOut (Join-Path $resources 'app.asar') -Force

    $contents = Join-Path $bundle.FullName 'Contents'
    $plist = Join-Path $contents 'Info.plist'
    $text = Get-Content $plist -Raw
    $text = $text -replace '<string>Electron</string>', '<string>MQR</string>'
    $text = $text -replace 'com\.electron\.electron', 'es.msof.mqr'
    $text = $text -replace 'com\.github\.Electron', 'es.msof.mqr'
    Set-Content $plist -Value $text -Encoding UTF8

    $macDir = Join-Path $extract 'MQr.app'
    if (Test-Path $macDir) { Remove-Item $macDir -Recurse -Force }
    Rename-Item $bundle.FullName 'MQr.app'
    $exe = Join-Path $contents 'MacOS\Electron'
    if (Test-Path $exe) { Rename-Item $exe 'MQr' }

    $out = "dist\MQr-$version-macOS-$arch.zip"
    if (Test-Path $out) { Remove-Item $out -Force }
    Write-Host "Comprimiendo $out..." -ForegroundColor Cyan
    & tar.exe -a -cf $out -C $extract 'MQr.app'
    if ($LASTEXITCODE -ne 0) { throw "No se pudo comprimir $out" }
    Get-Item $out | Select-Object Name, Length
}

Write-Host 'ZIP de macOS listos (sin firma; requiere notarización para distribución fuera de App Store).' -ForegroundColor Green
