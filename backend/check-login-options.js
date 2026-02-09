const db = require('./config/database');

async function checkUsers() {
  try {
    console.log('\n📋 USUARIOS EXISTENTES Y OPCIONES DE LOGIN:\n');
    console.log('='.repeat(80));

    const [users] = await db.query(`
      SELECT id, username, email, whatsapp, nombre, apellido, activo
      FROM usuarios_admin
      ORDER BY id
    `);

    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      process.exit(0);
    }

    users.forEach((user, index) => {
      console.log(`\n👤 Usuario ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Nombre: ${user.nombre} ${user.apellido}`);
      console.log(`   Username: ${user.username || '(sin username)'}`);
      console.log(`   Email: ${user.email || '(sin email)'}`);
      console.log(`   WhatsApp: ${user.whatsapp || '(sin whatsapp)'}`);
      console.log(`   Estado: ${user.activo ? '✅ Activo' : '❌ Inactivo'}`);
      
      console.log('\n   🔑 OPCIONES DE LOGIN:');
      
      if (user.email) {
        console.log(`      ✅ Tab Email → Email: "${user.email}" + contraseña`);
      }
      
      if (user.username) {
        console.log(`      ✅ Tab Email → Email: "${user.username}" + contraseña (por compatibilidad)`);
      }
      
      if (user.whatsapp) {
        console.log(`      ✅ Tab WhatsApp → WhatsApp: "${user.whatsapp}" + contraseña`);
      } else {
        console.log(`      ⚠️  Tab WhatsApp → Necesita agregar número de WhatsApp primero`);
      }
      
      console.log('   ' + '-'.repeat(70));
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Total de usuarios: ${users.length}`);
    console.log('\n💡 RECORDATORIO:');
    console.log('   - El backend acepta email, username o whatsapp');
    console.log('   - En el tab "Email" puedes usar email O username');
    console.log('   - En el tab "WhatsApp" solo funcionan números registrados\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
