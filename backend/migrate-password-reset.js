/**
 * Script de migración: Agregar campos para recuperación de contraseña
 * Ejecutar con: node migrate-password-reset.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'cesargoop',
      database: process.env.DB_NAME || 'listexa',
      multipleStatements: true
    });

    console.log('✅ Conexión exitosa');
    console.log('📄 Leyendo archivo de migración...');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '..', 'database', 'update_schema_password_reset.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('⚙️  Ejecutando migración...');
    
    // Ejecutar cada ALTER TABLE por separado para manejar errores de columnas existentes
    const sqlStatements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('USE'));

    let columnsAdded = 0;
    let columnsExisting = 0;

    for (const statement of sqlStatements) {
      try {
        await connection.query(statement);
        if (statement.includes('ADD COLUMN') || statement.includes('ADD INDEX')) {
          columnsAdded++;
        }
      } catch (error) {
        // Ignorar errores de columnas/índices duplicados
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
          columnsExisting++;
        } else {
          throw error; // Re-lanzar si es otro tipo de error
        }
      }
    }

    console.log('✅ Migración completada exitosamente');
    console.log('');
    console.log('📋 Campos agregados a usuarios_admin:');
    console.log('   • reset_code (VARCHAR(6))');
    console.log('   • reset_code_expires (DATETIME)');
    console.log('   • ultimo_intento_reset (DATETIME)');
    console.log('   • intentos_reset (INT)');
    console.log('');
    console.log('🎯 Sistema de recuperación de contraseña listo para usar');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
