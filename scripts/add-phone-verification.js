const db = require('../config/database');

async function addPhoneVerification() {
  try {
    console.log('📊 Agregando sistema de verificación telefónica...');
    
    // Agregar columna para verificación de teléfono en pacientes
    await db.query(`
      ALTER TABLE pacientes 
      ADD COLUMN telefono_verificado BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Columna telefono_verificado agregada a pacientes');

    // Crear tabla para códigos de verificación temporales
    await db.query(`
      CREATE TABLE IF NOT EXISTS codigos_verificacion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telefono VARCHAR(20) NOT NULL,
        codigo VARCHAR(6) NOT NULL,
        expira_en DATETIME NOT NULL,
        verificado BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_telefono (telefono),
        INDEX idx_codigo (codigo),
        INDEX idx_expira (expira_en)
      )
    `);
    console.log('✅ Tabla codigos_verificacion creada');

    console.log('🎉 Sistema de verificación instalado correctamente');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Las tablas ya existen');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

addPhoneVerification();
