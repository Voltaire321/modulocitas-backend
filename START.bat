@echo off
REM Script de inicio rápido para el Sistema de Citas Médicas (Windows)

echo ========================================
echo SISTEMA DE GESTION DE CITAS MEDICAS
echo ========================================
echo.

echo Verificando requisitos...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado
    pause
    exit /b 1
)
echo OK: Node.js instalado

echo.
echo ========================================
echo PASOS PARA INICIAR
echo ========================================
echo.
echo 1. CONFIGURAR BASE DE DATOS
echo    mysql -u root -p -P 3307 ^< database\schema.sql
echo.
echo 2. INSTALAR DEPENDENCIAS DEL BACKEND
echo    cd backend
echo    npm install
echo    cd ..
echo.
echo 3. INSTALAR DEPENDENCIAS DEL FRONTEND
echo    npm install
echo.
echo 4. INICIAR BACKEND (Terminal 1)
echo    cd backend
echo    npm run dev
echo.
echo 5. INICIAR FRONTEND (Terminal 2)
echo    npm start
echo.
echo ========================================
echo ACCESO AL SISTEMA
echo ========================================
echo.
echo Frontend: http://localhost:4200
echo Backend API: http://localhost:3000
echo.
echo Usuario: drjuanperez
echo Password: admin123
echo.
echo ========================================
echo.
echo Para mas informacion, consulta:
echo - README.md
echo - GUIA_INSTALACION.md
echo.
pause
