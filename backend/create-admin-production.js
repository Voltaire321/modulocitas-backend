require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  console.log('\n🔐 CREANDO USUARIO ADMINISTRADOR EN PRODUCCIÓN\n');
  console.log('================================================================================\n');
  console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
  console.log(`🌐 Host: ${process.env.DB_HOST}\n`);

  // Datos del usuario admin
  const username = 'admin';
  const email = 'cesaraepena@gmail.com';
  const nombre = 'Cesar';
  const apellido = 'Peña';
  const password = 'admin123'; // CAMBIAR ESTO DESPUÉS DEL PRIMER LOGIN
  
  let db;
  
  try {
    // Conectar a la base de datos
    db = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('✅ Conectado a la base de datos\n');

    // Hash de la contraseña
    console.log('🔒 Encriptando contraseña...');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insertar usuario
    console.log('📝 Creando usuario...');
    const [result] = await db.execute(
      `INSERT INTO usuarios_admin 
       (username, email, nombre, apellido, password_hash, rol, activo) 
       VALUES (?, ?, ?, ?, ?, 'admin', TRUE)`,
      [username, email, nombre, apellido, password_hash]
    );

    console.log('\n✅ Usuario creado exitosamente!\n');
    console.log('📋 Detalles del usuario:');
    console.log(`   ID: ${result.insertId}`);
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Nombre: ${nombre} ${apellido}`);
    console.log(`   Rol: admin`);
    console.log(`   Contraseña: ${password}`);
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login\n');
    console.log('================================================================================');
    console.log(`\n🌐 URL de login: ${process.env.FRONTEND_URL}/login\n`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('\n⚠️  El usuario ya existe. Intenta con otro username o email\n');
    }
  } finally {
    if (db) await db.end();
  }
}

createAdminUser();
