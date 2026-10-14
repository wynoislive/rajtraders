@echo off
set "JAVA_HOME=%USERPROFILE%\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
set "KEYTOOL=%JAVA_HOME%\bin\keytool.exe"

if not exist "%KEYTOOL%" (
    set "KEYTOOL=keytool"
)

echo ========================================================
echo  RAJ TRADERS — Google Play Production Keystore Generator
echo ========================================================
echo.
echo Generating release.keystore in mobile-android folder...

cd /d "%~dp0mobile-android"

if exist "release.keystore" (
    echo [WARNING] release.keystore already exists in mobile-android!
    echo To regenerate, delete the existing file first.
    pause
    exit /b 0
)

"%KEYTOOL%" -genkeypair -v -keystore release.keystore -alias rajtraders-key -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Raj Traders, OU=Bakery, O=Raj Traders, L=Pali, ST=Madhya Pradesh, C=IN" -storepass RajTradersRelease2026! -keypass RajTradersRelease2026!

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] release.keystore created successfully!
    echo Location: %~dp0mobile-android\release.keystore
    echo Password: RajTradersRelease2026!
    echo Key Alias: rajtraders-key
    echo.
    echo Writing keystore.properties...
    (
        echo storeFile=release.keystore
        echo storePassword=RajTradersRelease2026!
        echo keyAlias=rajtraders-key
        echo keyPassword=RajTradersRelease2026!
    ) > keystore.properties
    echo [SUCCESS] keystore.properties configured! You can now run build-release-bundle.bat
) else (
    echo.
    echo [ERROR] Keystore generation failed with code %ERRORLEVEL%
)

pause
