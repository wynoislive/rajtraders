# PowerShell script to build the Google Play Release Bundle (.aab) and Release APK
$ErrorActionPreference = "Stop"

$env:JAVA_HOME = "$env:USERPROFILE\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " RAJ TRADERS -- Google Play Release Bundle Builder (.aab)" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\mobile-android"

if (-not (Test-Path "keystore.properties")) {
    Write-Host "[NOTICE] keystore.properties not found! Generating release keystore..." -ForegroundColor Yellow
    & "$PSScriptRoot\generate-keystore.bat"
}

Write-Host "Building Google Play Android App Bundle and Release APK..." -ForegroundColor Cyan
& .\gradlew.bat :app:bundleRelease :app:assembleRelease

if ($LASTEXITCODE -eq 0) {
    $aabPath = "$PSScriptRoot\mobile-android\app\build\outputs\bundle\release\app-release.aab"
    $destAab = "$PSScriptRoot\RAJ_TRADERS_PlayStore_Release.aab"
    
    if (Test-Path $aabPath) {
        Copy-Item -Path $aabPath -Destination $destAab -Force
    }

    $apkPath = "$PSScriptRoot\mobile-android\app\build\outputs\apk\release\app-release.apk"
    $destApk = "$PSScriptRoot\RAJ_TRADERS_Direct_Release.apk"
    if (Test-Path $apkPath) {
        Copy-Item -Path $apkPath -Destination $destApk -Force
    }

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================================`n" -ForegroundColor Green
    Write-Host "1. Google Play Console Bundle (.aab):" -ForegroundColor White
    Write-Host "   $aabPath" -ForegroundColor Yellow
    Write-Host "   -> Copied to root: $destAab" -ForegroundColor Green
    Write-Host "`n2. Standalone Release APK (.apk):" -ForegroundColor White
    Write-Host "   $apkPath" -ForegroundColor Yellow
    Write-Host "   -> Copied to root: $destApk" -ForegroundColor Green
} else {
    Write-Host "`nBUILD FAILED with exit code $LASTEXITCODE" -ForegroundColor Red
}
