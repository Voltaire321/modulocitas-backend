-- ============================================
-- SISTEMA DE GESTIÓN DE CITAS MÉDICAS
-- Base de datos MySQL
-- ============================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS listexa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE listexa;

-- ============================================
-- Tabla: medicos
-- Almacena la información de los médicos
-- ============================================
CREATE TABLE IF NOT EXISTS medicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    cedula_profesional VARCHAR(50) UNIQUE,
    foto_url VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: usuarios_admin
-- Para médicos y secretarias que acceden al panel
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios_admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    rol ENUM('medico', 'secretaria', 'admin') NOT NULL DEFAULT 'secretaria',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL,
    INDEX idx_username (username),
    INDEX idx_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: pacientes
-- Información de los pacientes
-- ============================================
CREATE TABLE IF NOT EXISTS pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(20) NOT NULL,
    fecha_nacimiento DATE,
    genero ENUM('masculino', 'femenino', 'otro', 'prefiero_no_decir'),
    direccion TEXT,
    notas_medicas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_telefono (telefono),
    INDEX idx_nombre_apellido (nombre, apellido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: configuracion_horarios
-- Define los horarios laborales del médico
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion_horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT NOT NULL,
    dia_semana ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_cita_minutos INT NOT NULL DEFAULT 30,
    tiempo_entre_citas_minutos INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    INDEX idx_medico_dia (medico_id, dia_semana),
    UNIQUE KEY unique_medico_dia_horario (medico_id, dia_semana, hora_inicio, hora_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: dias_no_laborables
-- Días específicos en que el médico no trabaja
-- ============================================
CREATE TABLE IF NOT EXISTS dias_no_laborables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT NOT NULL,
    fecha DATE NOT NULL,
    motivo VARCHAR(255),
    todo_el_dia BOOLEAN DEFAULT TRUE,
    hora_inicio TIME,
    hora_fin TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    INDEX idx_medico_fecha (medico_id, fecha),
    UNIQUE KEY unique_medico_fecha (medico_id, fecha, hora_inicio, hora_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: citas
-- Almacena todas las citas médicas
-- ============================================
CREATE TABLE IF NOT EXISTS citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT NOT NULL,
    paciente_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado ENUM('pendiente', 'confirmada', 'cancelada', 'rechazada', 'completada', 'no_asistio') NOT NULL DEFAULT 'pendiente',
    motivo_consulta TEXT,
    notas_paciente TEXT,
    notas_medico TEXT,
    motivo_cancelacion VARCHAR(255),
    cancelado_por ENUM('paciente', 'medico', 'sistema'),
    codigo_confirmacion VARCHAR(10) UNIQUE,
    recordatorio_enviado BOOLEAN DEFAULT FALSE,
    confirmacion_enviada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    INDEX idx_medico_fecha (medico_id, fecha),
    INDEX idx_paciente (paciente_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha_hora (fecha, hora_inicio),
    INDEX idx_codigo_confirmacion (codigo_confirmacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: notificaciones
-- Registro de notificaciones enviadas
-- ============================================
CREATE TABLE IF NOT EXISTS notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cita_id INT,
    tipo ENUM('confirmacion', 'recordatorio', 'cancelacion', 'rechazo', 'cambio') NOT NULL,
    canal ENUM('email', 'sms', 'whatsapp') NOT NULL,
    destinatario VARCHAR(150) NOT NULL,
    asunto VARCHAR(255),
    mensaje TEXT NOT NULL,
    enviado BOOLEAN DEFAULT FALSE,
    error TEXT,
    enviado_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL,
    INDEX idx_cita (cita_id),
    INDEX idx_enviado (enviado),
    INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: historial_cambios
-- Auditoría de cambios en las citas
-- ============================================
CREATE TABLE IF NOT EXISTS historial_cambios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cita_id INT,
    usuario_admin_id INT,
    accion VARCHAR(50) NOT NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    detalles JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_admin_id) REFERENCES usuarios_admin(id) ON DELETE SET NULL,
    INDEX idx_cita (cita_id),
    INDEX idx_usuario (usuario_admin_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: configuracion_sistema
-- Configuraciones generales del sistema
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT,
    clave VARCHAR(100) NOT NULL,
    valor TEXT,
    tipo ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_medico_clave (medico_id, clave),
    INDEX idx_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Datos de ejemplo
-- ============================================

-- Insertar médico de ejemplo
INSERT INTO medicos (nombre, apellido, especialidad, email, telefono, cedula_profesional) VALUES
('Dr. Juan', 'Pérez García', 'Medicina General', 'juan.perez@example.com', '5551234567', 'CED123456'),
('Dra. María', 'López Sánchez', 'Pediatría', 'maria.lopez@example.com', '5557654321', 'CED654321');

-- Insertar usuario admin de ejemplo (password: admin123 - hash bcrypt)
INSERT INTO usuarios_admin (medico_id, username, password_hash, nombre, apellido, email, rol) VALUES
(1, 'drjuanperez', '$2b$10$rW3qL0sE8vKxJxH.yGqEQOZXYqJxKQVqYvKxJxH.yGqEQOZXYqJxK', 'Juan', 'Pérez García', 'juan.perez@example.com', 'medico'),
(1, 'secretaria1', '$2b$10$rW3qL0sE8vKxJxH.yGqEQOZXYqJxKQVqYvKxJxH.yGqEQOZXYqJxK', 'Ana', 'Martínez', 'ana.martinez@example.com', 'secretaria');

-- Configurar horarios laborales para el médico
INSERT INTO configuracion_horarios (medico_id, dia_semana, hora_inicio, hora_fin, duracion_cita_minutos, tiempo_entre_citas_minutos) VALUES
(1, 'lunes', '09:00:00', '13:00:00', 30, 0),
(1, 'lunes', '15:00:00', '19:00:00', 30, 0),
(1, 'martes', '09:00:00', '13:00:00', 30, 0),
(1, 'martes', '15:00:00', '19:00:00', 30, 0),
(1, 'miercoles', '09:00:00', '13:00:00', 30, 0),
(1, 'jueves', '09:00:00', '13:00:00', 30, 0),
(1, 'jueves', '15:00:00', '19:00:00', 30, 0),
(1, 'viernes', '09:00:00', '13:00:00', 30, 0);

-- Insertar paciente de ejemplo
INSERT INTO pacientes (nombre, apellido, email, telefono, fecha_nacimiento, genero) VALUES
('Carlos', 'Ramírez', 'carlos.ramirez@example.com', '5559876543', '1985-03-15', 'masculino'),
('Laura', 'González', 'laura.gonzalez@example.com', '5558765432', '1990-07-22', 'femenino');

-- Insertar cita de ejemplo
INSERT INTO citas (medico_id, paciente_id, fecha, hora_inicio, hora_fin, estado, motivo_consulta, codigo_confirmacion) VALUES
(1, 1, CURDATE() + INTERVAL 1 DAY, '10:00:00', '10:30:00', 'pendiente', 'Consulta general', 'CONF123456'),
(1, 2, CURDATE() + INTERVAL 2 DAY, '11:00:00', '11:30:00', 'confirmada', 'Control pediátrico', 'CONF789012');

-- Configuraciones del sistema
INSERT INTO configuracion_sistema (medico_id, clave, valor, tipo, descripcion) VALUES
(1, 'email_notificaciones', 'true', 'boolean', 'Enviar notificaciones por email'),
(1, 'recordatorio_horas_antes', '24', 'number', 'Horas antes de la cita para enviar recordatorio'),
(1, 'permitir_cancelacion_paciente', 'true', 'boolean', 'Permitir que pacientes cancelen sus citas'),
(1, 'horas_minimas_cancelacion', '2', 'number', 'Horas mínimas de anticipación para cancelar'),
(1, 'color_primario', '#3B82F6', 'string', 'Color primario de la interfaz'),
(1, 'color_secundario', '#10B981', 'string', 'Color secundario de la interfaz');
