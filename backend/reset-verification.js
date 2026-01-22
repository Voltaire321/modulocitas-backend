const mysql = require('mysql2/promise');

async function resetVerification() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'cesargoop',
    database: 'listexa'
  });

  try {
    // Eliminar todos los códigos de verificación pendientes
    await connection.execute('DELETE FROM codigos_verificacion WHERE verificado = FALSE');
    console.log('✅ Códigos de verificación pendientes eliminados');
    
    // Mostrar cuántos registros quedaron
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM codigos_verificacion');
    console.log(`📊 Registros en tabla: ${rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

resetVerification();
