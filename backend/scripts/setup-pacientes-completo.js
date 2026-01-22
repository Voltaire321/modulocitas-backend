const db = require('../config/database');

const setupPacientesCompleto = async () => {
  try {
    console.log('🏥 Configurando módulo de Gestión de Pacientes...\n');

    // 1. Actualizar tabla pacientes existente
    console.log('📋 Actualizando tabla pacientes...');
    
    const columnas = [
      'fecha_nacimiento DATE',
      "genero ENUM('masculino', 'femenino', 'otro') DEFAULT NULL",
      'direccion TEXT',
      'ciudad VARCHAR(100)',
      'estado VARCHAR(100)',
      'codigo_postal VARCHAR(10)',
      'ocupacion VARCHAR(150)',
      "estado_civil ENUM('soltero', 'casado', 'divorciado', 'viudo', 'union_libre') DEFAULT NULL",
      "tipo_sangre ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') DEFAULT NULL",
      "estatus ENUM('activo', 'seguimiento', 'alta', 'inactivo') DEFAULT 'activo'",
      'foto_perfil VARCHAR(500)',
      'email_secundario VARCHAR(150)',
      'telefono_emergencia VARCHAR(20)',
      'contacto_emergencia_nombre VARCHAR(200)',
      'contacto_emergencia_relacion VARCHAR(100)',
      'seguro_medico VARCHAR(200)',
      'numero_poliza VARCHAR(100)',
      'notas_generales TEXT',
      'fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    ];

    for (const columna of columnas) {
      const nombreColumna = columna.split(' ')[0];
      try {
        await db.query(`ALTER TABLE pacientes ADD COLUMN ${columna}`);
        console.log(`   ✓ Agregada columna: ${nombreColumna}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`   - Columna ya existe: ${nombreColumna}`);
        } else {
          throw error;
        }
      }
    }

    // 2. Crear tabla de historial médico
    console.log('📝 Creando tabla historial_medico...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS historial_medico (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT NOT NULL,
        fecha DATE NOT NULL,
        tipo ENUM('consulta', 'diagnostico', 'procedimiento', 'hospitalizacion', 'emergencia', 'otro') NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        descripcion TEXT,
        medico_id INT,
        diagnostico TEXT,
        tratamiento TEXT,
        medicamentos TEXT,
        examenes_solicitados TEXT,
        resultados TEXT,
        observaciones TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL,
        INDEX idx_paciente_fecha (paciente_id, fecha),
        INDEX idx_tipo (tipo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Crear tabla de antecedentes médicos
    console.log('🩺 Creando tabla antecedentes_medicos...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS antecedentes_medicos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT NOT NULL,
        categoria ENUM('personales', 'familiares', 'alergias', 'cirugias', 'hospitalizaciones', 'cronico') NOT NULL,
        condicion VARCHAR(200) NOT NULL,
        descripcion TEXT,
        fecha_diagnostico DATE,
        estado ENUM('activo', 'controlado', 'resuelto') DEFAULT 'activo',
        tratamiento_actual TEXT,
        notas TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        INDEX idx_paciente_categoria (paciente_id, categoria)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. Crear tabla de documentos adjuntos
    console.log('📎 Creando tabla documentos_paciente...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS documentos_paciente (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT NOT NULL,
        tipo_documento ENUM('estudio', 'receta', 'resultado', 'radiografia', 'consentimiento', 'otro') NOT NULL,
        nombre_archivo VARCHAR(255) NOT NULL,
        ruta_archivo VARCHAR(500) NOT NULL,
        descripcion TEXT,
        fecha_documento DATE,
        tamano_archivo INT,
        tipo_mime VARCHAR(100),
        subido_por INT,
        tags JSON,
        fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        FOREIGN KEY (subido_por) REFERENCES medicos(id) ON DELETE SET NULL,
        INDEX idx_paciente_tipo (paciente_id, tipo_documento),
        INDEX idx_fecha (fecha_documento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. Crear tabla de notas clínicas
    console.log('📝 Creando tabla notas_clinicas...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS notas_clinicas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT NOT NULL,
        medico_id INT NOT NULL,
        cita_id INT,
        tipo_nota ENUM('evolucion', 'observacion', 'seguimiento', 'administrativa', 'recordatorio') DEFAULT 'observacion',
        titulo VARCHAR(200),
        contenido TEXT NOT NULL,
        privada BOOLEAN DEFAULT FALSE,
        importante BOOLEAN DEFAULT FALSE,
        fecha_nota TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_recordatorio DATETIME,
        
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
        FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL,
        INDEX idx_paciente_fecha (paciente_id, fecha_nota),
        INDEX idx_importante (importante),
        INDEX idx_recordatorio (fecha_recordatorio)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. Crear tabla de etiquetas de pacientes
    console.log('🏷️  Creando tabla etiquetas_paciente...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS etiquetas_paciente (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT NOT NULL,
        etiqueta VARCHAR(50) NOT NULL,
        color VARCHAR(20) DEFAULT '#667eea',
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        UNIQUE KEY unique_paciente_etiqueta (paciente_id, etiqueta),
        INDEX idx_etiqueta (etiqueta)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. Crear tabla de signos vitales
    console.log('❤️  Creando tabla signos_vitales...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS signos_vitales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT NOT NULL,
        cita_id INT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        peso DECIMAL(5,2),
        altura DECIMAL(5,2),
        imc DECIMAL(5,2),
        temperatura DECIMAL(4,1),
        presion_sistolica INT,
        presion_diastolica INT,
        frecuencia_cardiaca INT,
        frecuencia_respiratoria INT,
        saturacion_oxigeno INT,
        glucosa INT,
        notas TEXT,
        
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL,
        INDEX idx_paciente_fecha (paciente_id, fecha_registro)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('\n✅ Módulo de Gestión de Pacientes configurado exitosamente');
    console.log('\n📊 Tablas creadas:');
    console.log('   - pacientes (actualizada con nuevos campos)');
    console.log('   - historial_medico');
    console.log('   - antecedentes_medicos');
    console.log('   - documentos_paciente');
    console.log('   - notas_clinicas');
    console.log('   - etiquetas_paciente');
    console.log('   - signos_vitales');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al configurar módulo:', error);
    process.exit(1);
  }
};

setupPacientesCompleto();
