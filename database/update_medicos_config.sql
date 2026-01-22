-- ============================================
-- ACTUALIZACIÓN: Agregar configuración individual por médico
-- Para WhatsApp, Google Calendar y avatar
-- ============================================

USE listexa;

-- Agregar columnas de configuración a la tabla medicos (verificar si existen primero)
ALTER TABLE medicos 
ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL COMMENT 'URL de la foto de perfil del médico';

ALTER TABLE medicos 
ADD COLUMN whatsapp_connected BOOLEAN DEFAULT FALSE COMMENT 'Indica si WhatsApp está conectado';

ALTER TABLE medicos 
ADD COLUMN whatsapp_session_id VARCHAR(100) DEFAULT NULL COMMENT 'ID de sesión de WhatsApp del médico';

ALTER TABLE medicos 
ADD COLUMN google_calendar_connected BOOLEAN DEFAULT FALSE COMMENT 'Indica si Google Calendar está conectado';

ALTER TABLE medicos 
ADD COLUMN google_calendar_email VARCHAR(150) DEFAULT NULL COMMENT 'Email del Google Calendar conectado';

ALTER TABLE medicos 
ADD COLUMN configuracion_completada BOOLEAN DEFAULT FALSE COMMENT 'Indica si completó el setup inicial';

-- Crear tabla para almacenar tokens de Google Calendar por médico
CREATE TABLE IF NOT EXISTS medicos_google_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50),
    expiry_date BIGINT,
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_medico_token (medico_id),
    INDEX idx_medico (medico_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla para gestión de sesiones de WhatsApp por médico
CREATE TABLE IF NOT EXISTS medicos_whatsapp_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT NOT NULL,
    session_id VARCHAR(100) NOT NULL COMMENT 'ID único de la sesión',
    session_path VARCHAR(255) NOT NULL COMMENT 'Ruta donde se guarda la sesión',
    connected BOOLEAN DEFAULT FALSE,
    qr_code TEXT DEFAULT NULL COMMENT 'Último QR generado (base64)',
    phone_number VARCHAR(20) DEFAULT NULL COMMENT 'Número conectado',
    last_connected TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_medico_session (medico_id),
    UNIQUE KEY unique_session_id (session_id),
    INDEX idx_medico (medico_id),
    INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Script ejecutado correctamente' AS resultado;
