/**
 * Verificar y agregar columnas de reset de contraseña
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAndAddColumns() {
  let connection;
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'cesargoop',
      database: process.env.DB_NAME || 'listexa'
    });

    console.log('✅ Conexión exitosa\n');

    // Verificar columnas existentes
    console.log('🔍 Verificando estructura de usuarios_admin...');
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM usuarios_admin WHERE Field IN ('reset_code', 'reset_code_expires', 'ultimo_intento_reset', 'intentos_reset')"
    );

    const existingColumns = columns.map(c => c.Field);
    console.log('📋 Columnas encontradas:', existingColumns);

    const columnsToAdd = [
      { name: 'reset_code', sql: 'ADD COLUMN reset_code VARCHAR(6)' },
      { name: 'reset_code_expires', sql: 'ADD COLUMN reset_code_expires DATETIME' },
      { name: 'ultimo_intento_reset', sql: 'ADD COLUMN ultimo_intento_reset DATETIME' },
      { name: 'intentos_reset', sql: 'ADD COLUMN intentos_reset INT DEFAULT 0' }
    ];

    let added = 0;
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`➕ Agregando columna: ${col.name}`);
        await connection.query(`ALTER TABLE usuarios_admin ${col.sql}`);
        added++;
      } else {
        console.log(`✅ Columna ya existe: ${col.name}`);
      }
    }

    // Verificar/agregar índice
    const [indexes] = await connection.query(
      "SHOW INDEX FROM usuarios_admin WHERE Key_name = 'idx_reset_code'"
    );

    if (indexes.length === 0) {
      console.log('➕ Agregando índice: idx_reset_code');
      await connection.query('ALTER TABLE usuarios_admin ADD INDEX idx_reset_code (reset_code)');
    } else {
      console.log('✅ Índice ya existe: idx_reset_code');
    }

    if (added > 0) {
      console.log(`\n✅ Se agregaron ${added} columnas nuevas`);
    } else {
      console.log('\n✅ Todas las columnas ya existían');
    }

    // Mostrar estructura final
    console.log('\n📊 Estructura final de usuarios_admin:');
    const [allColumns] = await connection.query('DESCRIBE usuarios_admin');
    allColumns.forEach(col => {
      if (col.Field.includes('reset') || col.Field.includes('intento')) {
        console.log(`   • ${col.Field} (${col.Type})`);
      }
    });

    console.log('\n🎯 Base de datos lista para recuperación de contraseña');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAndAddColumns();
