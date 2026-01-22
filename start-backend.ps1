# Script para iniciar el Backend
# Guardar como: start-backend.ps1

Write-Host "🚀 Iniciando Backend del Sistema de Citas..." -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del backend
Set-Location -Path "C:\Users\cesar\PracticasProfesionales\CitasWeb\modulocitas\backend"

Write-Host "📂 Directorio actual: $PWD" -ForegroundColor Yellow
Write-Host ""

# Verificar que existe server.js
if (Test-Path "server.js") {
    Write-Host "✅ Archivo server.js encontrado" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Iniciando servidor en puerto 3000..." -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    
    # Iniciar el servidor
    node server.js
} else {
    Write-Host "❌ Error: No se encontró server.js" -ForegroundColor Red
    Write-Host "   Verifica que estás en el directorio correcto" -ForegroundColor Yellow
}
