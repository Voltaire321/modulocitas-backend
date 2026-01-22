#!/bin/bash

# Script de inicio rápido para el Sistema de Citas Médicas

echo "🏥 SISTEMA DE GESTIÓN DE CITAS MÉDICAS"
echo "======================================"
echo ""

# Verificar Node.js
echo "📋 Verificando requisitos..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# Verificar MySQL
echo "🗄️  Verificando MySQL..."
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL no encontrado en PATH, asegúrate de que esté instalado"
fi

echo ""
echo "🚀 PASOS PARA INICIAR"
echo "===================="
echo ""
echo "1️⃣  CONFIGURAR BASE DE DATOS"
echo "   mysql -u root -p -P 3307 < database/schema.sql"
echo ""
echo "2️⃣  INSTALAR DEPENDENCIAS DEL BACKEND"
echo "   cd backend"
echo "   npm install"
echo "   cd .."
echo ""
echo "3️⃣  INSTALAR DEPENDENCIAS DEL FRONTEND"
echo "   npm install"
echo ""
echo "4️⃣  INICIAR BACKEND (Terminal 1)"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "5️⃣  INICIAR FRONTEND (Terminal 2)"
echo "   npm start"
echo ""
echo "📱 La aplicación estará disponible en:"
echo "   Frontend: http://localhost:4200"
echo "   Backend API: http://localhost:3000"
echo ""
echo "🔐 CREDENCIALES DE ACCESO:"
echo "   Usuario: drjuanperez"
echo "   Contraseña: admin123"
echo ""
echo "📚 Para más información, consulta:"
echo "   - README.md"
echo "   - GUIA_INSTALACION.md"
echo ""
