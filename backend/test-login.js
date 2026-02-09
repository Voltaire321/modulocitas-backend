const db = require('./config/database');
const bcrypt = require('bcrypt');

async function testLogin() {
  try {
    console.log('\n🔍 TEST DE LOGIN\n');
    console.log('='.repeat(80));

    // Obtener usuarios
    const [users] = await db.query(`
      SELECT id, username, email, password_hash
      FROM usuarios_admin
      WHERE activo = TRUE
      ORDER BY id
      LIMIT 3
    `);

    if (users.length === 0) {
      console.log('❌ No hay usuarios activos');
      process.exit(1);
    }

    console.log(`\n📋 Usuarios encontrados: ${users.length}\n`);

    for (const user of users) {
      console.log(`\n👤 Usuario ID ${user.id}:`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password Hash: ${user.password_hash ? '✅ Existe' : '❌ No existe'}`);
      
      if (user.password_hash) {
        // Probar con contraseña común
        const testPasswords = ['admin123', 'password', '123456', 'admin', user.username];
        
        for (const pwd of testPasswords) {
          const match = await bcrypt.compare(pwd, user.password_hash);
          if (match) {
            console.log(`   🔑 Contraseña encontrada: "${pwd}"`);
            console.log(`\n   ✅ PRUEBA ESTO EN EL LOGIN:`);
            console.log(`      Email/Username: ${user.email} o ${user.username}`);
            console.log(`      Contraseña: ${pwd}`);
            break;
          }
        }
      }
      console.log('   ' + '-'.repeat(70));
    }

    console.log('\n💡 Si no sabes la contraseña, puedes crear una nueva así:\n');
    console.log('   node -e "const bcrypt = require(\'bcrypt\'); bcrypt.hash(\'nuevapass123\', 10).then(h => console.log(h))"\n');
    console.log('   Luego actualiza: UPDATE usuarios_admin SET password_hash = \'HASH_GENERADO\' WHERE id = 1;\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();
