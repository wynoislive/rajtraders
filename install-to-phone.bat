@echo off
set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

echo ========================================================
echo  RAJ TRADERS -- Install Signed APK to Android Device
echo ========================================================
echo.

if not exist "%ADB%" (
    echo [ERROR] ADB not found at: %ADB%
    pause
    exit /b 1
)

if not exist "%~dp0RAJ_TRADERS_Direct_Release.apk" (
    echo [ERROR] RAJ_TRADERS_Direct_Release.apk not found in root directory!
    echo Please run build-release-bundle.bat first.
    pause
    exit /b 1
)

echo Checking for connected Android devices...
"%ADB%" devices

echo.
echo Installing RAJ_TRADERS_Direct_Release.apk...
"%ADB%" install -r "%~dp0RAJ_TRADERS_Direct_Release.apk"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! App installed successfully on your device.
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  INSTALLATION FAILED OR NO DEVICE CONNECTED.
    echo  Please ensure:
    echo   1. Your phone is connected via USB.
    echo   2. 'USB Debugging' is enabled in Developer Options.
    echo   3. Alternatively, copy RAJ_TRADERS_Direct_Release.apk
    echo      directly to your phone storage and tap to install!
    echo ========================================================
)

echo.
pause
