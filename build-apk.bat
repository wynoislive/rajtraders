@echo off
set "JAVA_HOME=%USERPROFILE%\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"

echo Building Android APK...
cd /d "%~dp0mobile-android"
call gradlew.bat :app:assembleDebug

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo BUILD SUCCESSFUL!
    echo APK Location: %~dp0mobile-android\app\build\outputs\apk\debug\app-debug.apk
    echo ========================================================
) else (
    echo.
    echo BUILD FAILED with error code %ERRORLEVEL%
)
pause
