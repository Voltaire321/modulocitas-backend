const db = require('./config/database');

async function addGoogleCalendarColumn() {
  try {
    console.log('📊 Agregando columna google_event_id a la tabla citas...');
    
    await db.query(`
      ALTER TABLE citas 
      ADD COLUMN google_event_id VARCHAR(255) DEFAULT NULL
    `);
    
    console.log('✅ Columna agregada exitosamente');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  La columna google_event_id ya existe');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

addGoogleCalendarColumn();
