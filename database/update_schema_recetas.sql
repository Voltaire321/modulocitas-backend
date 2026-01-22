-- ============================================
-- ACTUALIZACIÓN DE SCHEMA: SUPERUSUARIO Y RECETAS
-- ============================================

USE listexa;

-- Modificar el ENUM de rol para incluir superadmin y cambiar medico por doctor
ALTER TABLE usuarios_admin 
MODIFY COLUMN rol ENUM('superadmin', 'doctor', 'secretaria', 'medico', 'admin') NOT NULL DEFAULT 'doctor';

-- Actualizar valores antiguos a nuevos
UPDATE usuarios_admin 
SET rol = CASE 
    WHEN username = 'drjuanperez' THEN 'superadmin'
    WHEN rol = 'medico' THEN 'doctor'
    WHEN rol = 'admin' THEN 'doctor'
    ELSE rol
END;

-- Eliminar valores antiguos del ENUM
ALTER TABLE usuarios_admin 
MODIFY COLUMN rol ENUM('superadmin', 'doctor', 'secretaria') NOT NULL DEFAULT 'doctor';

-- ============================================
-- Tabla: recetas_medicas
-- Almacena las recetas generadas por los médicos
-- ============================================
CREATE TABLE IF NOT EXISTS recetas_medicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cita_id INT NOT NULL,
    medico_id INT NOT NULL,
    paciente_id INT NOT NULL,
    fecha_emision DATE NOT NULL,
    diagnostico TEXT NOT NULL,
    indicaciones TEXT,
    vigencia_dias INT DEFAULT 30,
    folio VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    INDEX idx_medico (medico_id),
    INDEX idx_paciente (paciente_id),
    INDEX idx_fecha (fecha_emision),
    INDEX idx_folio (folio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: medicamentos_receta
-- Detalle de medicamentos en cada receta
-- ============================================
CREATE TABLE IF NOT EXISTS medicamentos_receta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receta_id INT NOT NULL,
    medicamento VARCHAR(255) NOT NULL,
    presentacion VARCHAR(100),
    dosis VARCHAR(100) NOT NULL,
    frecuencia VARCHAR(100) NOT NULL,
    duracion VARCHAR(100) NOT NULL,
    cantidad VARCHAR(50),
    via_administracion ENUM('oral', 'topica', 'intravenosa', 'intramuscular', 'subcutanea', 'otra') DEFAULT 'oral',
    indicaciones_especiales TEXT,
    orden INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receta_id) REFERENCES recetas_medicas(id) ON DELETE CASCADE,
    INDEX idx_receta (receta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Actualizar valores antiguos a nuevos
UPDATE usuarios_admin 
SET rol = CASE 
    WHEN username = 'drjuanperez' THEN 'superadmin'
    WHEN rol = 'medico' THEN 'doctor'
    WHEN rol = 'admin' THEN 'doctor'
    ELSE rol
END;

-- ============================================
-- Datos de ejemplo para recetas
-- ============================================

-- Crear cita de ejemplo si no existe (para testing)
INSERT IGNORE INTO citas (id, medico_id, paciente_id, fecha, hora_inicio, hora_fin, estado, codigo_confirmacion)
SELECT 1, 1, 1, CURDATE(), '10:00:00', '10:30:00', 'completada', 'ABC123'
WHERE NOT EXISTS (SELECT 1 FROM citas WHERE id = 1);

SELECT 'Schema actualizado: Roles de usuario y recetas médicas agregados' as mensaje;
