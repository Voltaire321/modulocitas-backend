/**
 * Script para verificar usuarios y sus emails
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
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

    // Verificar usuarios
    const [users] = await connection.query(
      'SELECT id, username, email, nombre, apellido, activo FROM usuarios_admin WHERE activo = TRUE'
    );

    console.log('📋 Usuarios activos en el sistema:\n');
    
    if (users.length === 0) {
      console.log('⚠️ No hay usuarios activos en la base de datos');
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Email: ${user.email || '❌ SIN EMAIL'}`);
        console.log(`Nombre: ${user.nombre || ''} ${user.apellido || ''}`);
        console.log('---');
      });

      const usersWithoutEmail = users.filter(u => !u.email);
      if (usersWithoutEmail.length > 0) {
        console.log(`\n⚠️ ${usersWithoutEmail.length} usuario(s) sin email configurado`);
        console.log('\n💡 Para habilitar recuperación de contraseña, ejecuta:');
        console.log(`   UPDATE usuarios_admin SET email = 'tuemail@gmail.com' WHERE id = ${usersWithoutEmail[0].id};`);
      } else {
        console.log('\n✅ Todos los usuarios tienen email configurado');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsers();
