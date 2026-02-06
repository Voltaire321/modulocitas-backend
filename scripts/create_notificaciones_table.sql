-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
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
