require('dotenv').config({ path: '.env.production' });
const db = require('./config/database');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  console.log('\n👤 CREAR USUARIO ADMINISTRADOR\n');
  console.log('='.repeat(80));

  try {
    // Test conexión
    await db.query('SELECT 1');
    console.log('✅ Conexión a BD exitosa\n');

    // Solicitar datos
    const username = await question('Username: ');
    const email = await question('Email: ');
    const password = await question('Contraseña: ');
    const nombre = await question('Nombre: ');
    const apellido = await question('Apellido: ');

    if (!username || !email || !password || !nombre || !apellido) {
      console.log('❌ Todos los campos son requeridos');
      process.exit(1);
    }

    // Hash password
    console.log('\n🔐 Generando hash de contraseña...');
    const password_hash = await bcrypt.hash(password, 10);

    // Insertar usuario
    console.log('💾 Creando usuario...');
    const [result] = await db.query(
      `INSERT INTO usuarios_admin 
       (username, email, password_hash, nombre, apellido, rol, activo) 
       VALUES (?, ?, ?, ?, ?, 'doctor', TRUE)`,
      [username, email, password_hash, nombre, apellido]
    );

    console.log('\n✅ Usuario creado exitosamente!');
    console.log('\n📋 Detalles:');
    console.log(`   ID: ${result.insertId}`);
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Nombre: ${nombre} ${apellido}`);
    console.log(`   Rol: doctor`);
    console.log('\n🔑 Ahora puedes iniciar sesión con:');
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Contraseña: [la que ingresaste]\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
