# PowerShell script to build the Android debug APK
$ErrorActionPreference = "Stop"

$env:JAVA_HOME = "$env:USERPROFILE\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

Write-Host "Building Android APK..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\mobile-android"
& .\gradlew.bat :app:assembleDebug

if ($LASTEXITCODE -eq 0) {
    $apkPath = "$PSScriptRoot\mobile-android\app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "`nBUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "APK Location: $apkPath" -ForegroundColor Yellow
} else {
    Write-Host "`nBUILD FAILED with exit code $LASTEXITCODE" -ForegroundColor Red
}
