@echo off
set "JAVA_HOME=%USERPROFILE%\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"

echo ========================================================
echo  RAJ TRADERS -- Google Play Release Bundle Builder (.aab)
echo ========================================================
echo.

cd /d "%~dp0mobile-android"

if not exist "keystore.properties" (
    echo [NOTICE] keystore.properties not found!
    echo Running generate-keystore.bat first to set up signing credentials...
    call "%~dp0generate-keystore.bat"
)

echo.
echo Building Google Play Android App Bundle and Release APK...
call gradlew.bat :app:bundleRelease :app:assembleRelease

if %ERRORLEVEL% neq 0 goto :build_failed

echo.
echo ========================================================
echo  BUILD SUCCESSFUL!
echo ========================================================
echo.
echo 1. Google Play Console Bundle (.aab) location:
echo    mobile-android\app\build\outputs\bundle\release\app-release.aab
echo.
echo 2. Standalone Release APK (.apk) location:
echo    mobile-android\app\build\outputs\apk\release\app-release.apk
echo.

copy "%~dp0mobile-android\app\build\outputs\bundle\release\app-release.aab" "%~dp0RAJ_TRADERS_PlayStore_Release.aab" > nul 2>&1
if exist "%~dp0RAJ_TRADERS_PlayStore_Release.aab" (
    echo [READY] Play Store AAB: RAJ_TRADERS_PlayStore_Release.aab
)

copy "%~dp0mobile-android\app\build\outputs\apk\release\app-release.apk" "%~dp0RAJ_TRADERS_Direct_Release.apk" > nul 2>&1
if exist "%~dp0RAJ_TRADERS_Direct_Release.apk" (
    echo [READY] Direct Phone APK: RAJ_TRADERS_Direct_Release.apk
)
goto :end

:build_failed
echo.
echo ========================================================
echo  BUILD FAILED with error code %ERRORLEVEL%
echo ========================================================

:end
pause
