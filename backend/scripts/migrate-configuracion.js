const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración de configuración del consultorio...\n');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '../../database/configuracion_consultorio.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Dividir en statements individuales (separados por ;)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('USE'));

    console.log(`📝 Encontrados ${statements.length} statements SQL\n`);

    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Extraer el nombre de la tabla del CREATE TABLE
      const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      const insertMatch = statement.match(/INSERT INTO (\w+)/i);
      
      if (tableMatch) {
        console.log(`📦 Creando tabla: ${tableMatch[1]}...`);
      } else if (insertMatch) {
        console.log(`📝 Insertando datos en: ${insertMatch[1]}...`);
      }

      try {
        await db.query(statement);
        console.log('   ✅ Éxito\n');
      } catch (error) {
        // Si es error de tabla duplicada o datos duplicados, ignorar
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
          console.log('   ⚠️  Ya existe (ignorado)\n');
        } else {
          console.error('   ❌ Error:', error.message);
          console.error('   Statement:', statement.substring(0, 100) + '...\n');
        }
      }
    }

    console.log('✅ Migración completada exitosamente\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

runMigration();
