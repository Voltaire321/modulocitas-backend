const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function crearTablasRecetas() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'cesargoop',
    database: process.env.DB_NAME || 'listexa',
    multipleStatements: true
  });

  try {
    console.log('🔄 Creando tablas de recetas...');

    const sqlPath = path.join(__dirname, '../../database/update_schema_recetas.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await connection.query(sql);

    console.log('✅ Tablas de recetas creadas exitosamente');
    console.log('   - recetas_medicas');
    console.log('   - medicamentos_receta');
  } catch (error) {
    console.error('❌ Error al crear tablas:', error.message);
  } finally {
    await connection.end();
  }
}

crearTablasRecetas();
