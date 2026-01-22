# Script para iniciar el Frontend
# Guardar como: start-frontend.ps1

Write-Host "🚀 Iniciando Frontend Angular..." -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio principal
Set-Location -Path "C:\Users\cesar\PracticasProfesionales\CitasWeb\modulocitas"

Write-Host "📂 Directorio actual: $PWD" -ForegroundColor Yellow
Write-Host ""

# Verificar que existe angular.json
if (Test-Path "angular.json") {
    Write-Host "✅ Proyecto Angular encontrado" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Compilando y sirviendo aplicación..." -ForegroundColor Cyan
    Write-Host "   URL: http://localhost:4200" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    
    # Iniciar Angular
    ng serve --open
} else {
    Write-Host "❌ Error: No se encontró angular.json" -ForegroundColor Red
    Write-Host "   Verifica que estás en el directorio correcto" -ForegroundColor Yellow
}
