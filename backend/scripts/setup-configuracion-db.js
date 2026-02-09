const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'cesargoop',
    database: process.env.DB_NAME || 'listexa',
    multipleStatements: true
  });

  console.log('✅ Conectado a la base de datos');

  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../../database/configuracion_consultorio.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar el SQL
    console.log('📦 Creando tablas de configuración del consultorio...');
    await connection.query(sql);
    
    console.log('✅ Tablas creadas exitosamente:');
    console.log('   - configuracion_consultorio');
    console.log('   - tipos_consulta');
    console.log('   - especialidades_medico');
    console.log('   - metodos_pago');
    console.log('   - dias_festivos');
    
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️ Las tablas ya existen');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await connection.end();
  }
}

setupDatabase().catch(console.error);
