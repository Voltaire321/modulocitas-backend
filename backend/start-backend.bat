@echo off
cd /d "%~dp0"
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Eliminando sesion de WhatsApp...
rd /s /q whatsapp-session >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo ====================================
echo Iniciando servidor backend...
echo ====================================
echo.
node server.js
pause
