# Prepara la carpeta MEGA de Mqr 1.1 con los artefactos compilados.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

$version = '1.1'
$target = 'C:\Users\Monty\Documents\MEGA\Mqr-1.1'

if (Test-Path $target) { throw "Ya existe $target. Revisa su contenido antes de sobrescribirlo." }
New-Item -ItemType Directory -Path $target -Force | Out-Null

function Copy-Artifact([string]$source, [string]$name) {
    if (-not (Test-Path $source)) { throw "Falta el artefacto: $source" }
    Copy-Item $source (Join-Path $target $name) -Force
    Write-Host ("  {0}" -f $name) -ForegroundColor DarkGray
}

Write-Host 'Windows' -ForegroundColor Cyan
Copy-Artifact 'dist\MQr-1.1.0-x64-setup.exe' "Mqr-$version-Windows-x64-Setup.exe"
Copy-Artifact 'dist\MQr-1.1.0-x64-portable.exe' "Mqr-$version-Windows-x64-Portable.exe"

Write-Host 'Linux' -ForegroundColor Cyan
Copy-Artifact 'dist\mqr-1.1.0.tar.gz' "Mqr-$version-Linux-x64.tar.gz"
Copy-Artifact 'dist\mqr-1.1.0-arm64.tar.gz' "Mqr-$version-Linux-ARM64.tar.gz"

Write-Host 'macOS (sin firmar)' -ForegroundColor Cyan
Copy-Artifact 'dist\MQr-1.1.0-macOS-x64.zip' "Mqr-$version-macOS-Intel.zip"
Copy-Artifact 'dist\MQr-1.1.0-macOS-arm64.zip' "Mqr-$version-macOS-AppleSilicon.zip"

Write-Host 'Android' -ForegroundColor Cyan
$apk = Get-ChildItem 'dist\android-apk' -Recurse -File -Filter 'es.msof.mqr-Signed.apk' | Select-Object -First 1
$aab = Get-ChildItem 'dist\android-aab' -Recurse -File -Filter 'es.msof.mqr-Signed.aab' | Select-Object -First 1
if ($null -eq $apk) { throw 'No se encontró el APK firmado.' }
if ($null -eq $aab) { throw 'No se encontró el AAB firmado.' }
Copy-Artifact $apk.FullName "Mqr-$version-Android.apk"
Copy-Artifact $aab.FullName "Mqr-$version-Android.aab"

$readme = @"
MQr $version — paquetes para MEGA
=================================

Novedad 1.1.0: pestaña «Crear QR» con corrección L/M/Q/H, tamaños 256/512/1024 px,
descarga PNG y copiar imagen/texto. El lector sigue funcionando igual y todas las
librerías van incluidas localmente: la app funciona sin conexión.

Windows
- Mqr-$version-Windows-x64-Setup.exe: instalador NSIS para Windows 10/11 x64.
- Mqr-$version-Windows-x64-Portable.exe: ejecutable portable, sin instalación.

Linux
- Mqr-$version-Linux-x64.tar.gz y Mqr-$version-Linux-ARM64.tar.gz: bundle Electron
  con el ejecutable y las librerías. Descomprime y ejecuta «MQr».

macOS
- Mqr-$version-macOS-Intel.zip (x64) y Mqr-$version-macOS-AppleSilicon.zip (arm64).
- Contienen MQr.app. No están firmados ni notarizados: macOS puede bloquear la
  primera apertura. Para distribuirlos fuera de App Store hacen falta certificado
  de desarrollador y notarización de Apple.

Android
- Mqr-$version-Android.apk para instalar y Mqr-$version-Android.aab para tiendas.
- Firmados con certificado de depuración: hay que firmarlos con la clave de MSoft
  antes de publicarlos en Google Play.

iOS
- No se incluye IPA: requiere macOS/Xcode, certificado de distribución y perfil
  de aprovisionamiento de Apple. El proyecto ios-native compila para ios-arm64.

Donaciones
- Aviso cada 3 lanzamientos y enlaces a PayPal y Liberapay en el pie de la app.

Verificación
- SHA256SUMS.txt contiene el hash de todos los archivos de esta carpeta.
- Las descargas de la web deben usar los enlaces definitivos de MEGA.

© 2026 MSoft. Licencia MIT.
"@
Set-Content -Path (Join-Path $target 'LEEME.txt') -Value $readme -Encoding UTF8

$hashes = Get-ChildItem $target -File |
    Where-Object { $_.Name -ne 'SHA256SUMS.txt' } |
    Sort-Object Name |
    ForEach-Object {
        $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToUpperInvariant()
        "{0}  {1}" -f $hash, $_.Name
    }
Set-Content -Path (Join-Path $target 'SHA256SUMS.txt') -Value $hashes -Encoding UTF8

Write-Host "`nCarpeta lista: $target" -ForegroundColor Green
Get-ChildItem $target -File | Select-Object Name, Length | Format-Table -AutoSize
