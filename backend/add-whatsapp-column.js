const db = require('./config/database');

async function addWhatsappColumn() {
  try {
    console.log('🔧 Agregando columna whatsapp a usuarios_admin...');

    // Verificar si la columna ya existe
    const [columns] = await db.query(`
      SHOW COLUMNS FROM usuarios_admin LIKE 'whatsapp'
    `);

    if (columns.length > 0) {
      console.log('✅ La columna whatsapp ya existe');
    } else {
      // Agregar columna whatsapp
      await db.query(`
        ALTER TABLE usuarios_admin 
        ADD COLUMN whatsapp VARCHAR(20) NULL AFTER email
      `);
      console.log('✅ Columna whatsapp agregada exitosamente');
    }

    // Verificar si existe el índice
    const [indexes] = await db.query(`
      SHOW INDEXES FROM usuarios_admin WHERE Key_name = 'idx_whatsapp'
    `);

    if (indexes.length === 0) {
      await db.query(`
        ALTER TABLE usuarios_admin
        ADD INDEX idx_whatsapp (whatsapp)
      `);
      console.log('✅ Índice idx_whatsapp creado');
    } else {
      console.log('✅ Índice idx_whatsapp ya existe');
    }

    // Verificar índice para email
    const [emailIndexes] = await db.query(`
      SHOW INDEXES FROM usuarios_admin WHERE Key_name = 'idx_email'
    `);

    if (emailIndexes.length === 0) {
      await db.query(`
        ALTER TABLE usuarios_admin
        ADD INDEX idx_email (email)
      `);
      console.log('✅ Índice idx_email creado');
    } else {
      console.log('✅ Índice idx_email ya existe');
    }

    console.log('🎉 Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    process.exit(1);
  }
}

addWhatsappColumn();
