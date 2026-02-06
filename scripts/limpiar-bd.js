const mysql = require('mysql2/promise');
require('dotenv').config();

async function limpiarCitas() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'cesargoop',
    database: process.env.DB_NAME || 'listexa'
  });

  try {
    console.log('🔄 Limpiando base de datos...');

    // Deshabilitar comprobación de claves foráneas
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Eliminar notificaciones relacionadas con citas
    await connection.query("DELETE FROM notificaciones WHERE tipo IN ('nueva_cita', 'cita_aceptada', 'cita_rechazada', 'cita_cancelada')");
    console.log('✅ Notificaciones eliminadas');

    // Verificar si existe la tabla recetas
    const [tables] = await connection.query("SHOW TABLES LIKE 'recetas'");
    if (tables.length > 0) {
      await connection.query('DELETE FROM recetas');
      console.log('✅ Recetas eliminadas');
    }

    // Eliminar citas
    await connection.query('DELETE FROM citas');
    console.log('✅ Citas eliminadas');

    // Reiniciar autoincremento
    await connection.query('ALTER TABLE citas AUTO_INCREMENT = 1');
    if (tables.length > 0) {
      await connection.query('ALTER TABLE recetas AUTO_INCREMENT = 1');
    }
    await connection.query('ALTER TABLE notificaciones AUTO_INCREMENT = 1');
    console.log('✅ Autoincrementos reiniciados');

    // Reactivar comprobación de claves foráneas
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Base de datos limpiada exitosamente');
  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error.message);
  } finally {
    await connection.end();
  }
}

limpiarCitas();
