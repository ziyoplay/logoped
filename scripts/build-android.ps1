$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolDir = Join-Path $projectRoot '.tools'
$sdkPath = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
if (-not (Test-Path -LiteralPath $sdkPath)) { throw 'Android SDK topilmadi. Android Studio orqali SDK 36 va build-tools 35.0.0 ni o‘rnating.' }
$env:ANDROID_HOME = $sdkPath
if (-not $env:JAVA_HOME) {
    $javaExecutable = (Get-Command java.exe -ErrorAction Stop).Source
    $env:JAVA_HOME = Split-Path -Parent (Split-Path -Parent $javaExecutable)
}
$gradleExe = Join-Path $toolDir 'gradle-8.13/bin/gradle.bat'
if (-not (Test-Path -LiteralPath $gradleExe)) {
    New-Item -ItemType Directory -Force -Path $toolDir | Out-Null
    $zipPath = Join-Path $toolDir 'gradle-8.13-bin.zip'
    if (-not (Test-Path -LiteralPath $zipPath) -or (Get-Item -LiteralPath $zipPath).Length -eq 0) {
        & curl.exe --fail --location --retry 2 --connect-timeout 20 --max-time 300 --silent --show-error 'https://downloads.gradle.org/distributions/gradle-8.13-bin.zip' --output $zipPath
        if ($LASTEXITCODE -ne 0) { throw 'Gradle yuklab olinmadi.' }
    }
    $expected = (& curl.exe --fail --location --connect-timeout 20 --max-time 60 --silent --show-error 'https://downloads.gradle.org/distributions/gradle-8.13-bin.zip.sha256').Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Gradle tekshiruv summasi yuklab olinmadi.' }
    $zipStream = [System.IO.File]::OpenRead($zipPath)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { $actual = [BitConverter]::ToString($sha.ComputeHash($zipStream)).Replace('-', '').ToLowerInvariant() }
    finally { $zipStream.Dispose(); $sha.Dispose() }
    if ($actual -ne $expected.ToLowerInvariant()) { throw 'Gradle SHA256 tekshiruvi muvaffaqiyatsiz.' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $toolDir)
}
Push-Location (Join-Path $projectRoot 'android')
try {
    & $gradleExe --no-daemon assembleDebug lintDebug
    if ($LASTEXITCODE -ne 0) { throw 'Android build bajarilmadi.' }
    New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'artifacts') | Out-Null
    Copy-Item -LiteralPath 'app/build/outputs/apk/debug/app-debug.apk' -Destination (Join-Path $projectRoot 'artifacts/nutq-debug.apk') -Force
} finally { Pop-Location }
