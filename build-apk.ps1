# PowerShell script to build the Android debug APK
$ErrorActionPreference = "Stop"

$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$gradleBat = "$env:USERPROFILE\.gradle-dist\gradle-8.11.1\bin\gradle.bat"

Write-Host "Building Android APK..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\mobile-android"
& $gradleBat :app:assembleDebug

if ($LASTEXITCODE -eq 0) {
    $apkPath = "$PSScriptRoot\mobile-android\app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "`nBUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "APK Location: $apkPath" -ForegroundColor Yellow
} else {
    Write-Host "`nBUILD FAILED with exit code $LASTEXITCODE" -ForegroundColor Red
}
