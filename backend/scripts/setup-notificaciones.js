const db = require('../config/database');

const createNotificacionesTable = async () => {
  try {
    // Primero eliminar la tabla si existe
    console.log('🗑️  Eliminando tabla notificaciones antigua...');
    await db.query('DROP TABLE IF EXISTS notificaciones');
    
    // Crear la nueva tabla con la estructura correcta
    const sql = `
      CREATE TABLE notificaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo ENUM('cita_nueva', 'cita_aceptada', 'cita_rechazada', 'cita_cancelada', 'receta_nueva') NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        mensaje TEXT NOT NULL,
        usuario_id INT NOT NULL,
        usuario_tipo ENUM('paciente', 'medico') NOT NULL,
        cita_id INT NULL,
        receta_id INT NULL,
        leida BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usuario (usuario_id, usuario_tipo),
        INDEX idx_leida (leida),
        INDEX idx_fecha (fecha_creacion),
        FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await db.query(sql);
    console.log('✅ Tabla notificaciones creada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear tabla notificaciones:', error);
    process.exit(1);
  }
};

createNotificacionesTable();
