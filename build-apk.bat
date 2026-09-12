@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "GRADLE_BAT=%USERPROFILE%\.gradle-dist\gradle-8.11.1\bin\gradle.bat"

echo Building Android APK...
cd /d "%~dp0mobile-android"
call "%GRADLE_BAT%" :app:assembleDebug

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
