const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/pacientes');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'paciente-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos: imágenes, PDF, Word'));
    }
  }
});

// Obtener todos los pacientes con filtros y búsqueda
const getAllPacientes = async (req, res) => {
  try {
    const { busqueda, estatus, desde, limite } = req.query;
    
    let query = `
      SELECT 
        p.*,
        COUNT(DISTINCT c.id) as total_citas,
        MAX(c.fecha) as ultima_cita,
        GROUP_CONCAT(DISTINCT e.etiqueta) as etiquetas
      FROM pacientes p
      LEFT JOIN citas c ON p.id = c.paciente_id
      LEFT JOIN etiquetas_paciente e ON p.id = e.paciente_id
      WHERE 1=1
    `;
    const params = [];

    if (busqueda) {
      query += ` AND (p.nombre LIKE ? OR p.apellido LIKE ? OR p.email LIKE ? OR p.telefono LIKE ?)`;
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (estatus) {
      query += ` AND p.estatus = ?`;
      params.push(estatus);
    }

    query += ` GROUP BY p.id ORDER BY p.fecha_registro DESC`;

    if (limite) {
      query += ` LIMIT ?`;
      params.push(parseInt(limite));
    }

    if (desde) {
      query += ` OFFSET ?`;
      params.push(parseInt(desde));
    }

    const [pacientes] = await db.query(query, params);

    res.json({
      success: true,
      data: pacientes
    });
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener pacientes' });
  }
};

// Obtener perfil completo de un paciente
const getPacienteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Datos básicos del paciente
    const [paciente] = await db.query('SELECT * FROM pacientes WHERE id = ?', [id]);
    
    if (paciente.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paciente no encontrado'
      });
    }

    // Historial médico
    const [historial] = await db.query(`
      SELECT h.*, m.nombre as medico_nombre, m.apellido as medico_apellido
      FROM historial_medico h
      LEFT JOIN medicos m ON h.medico_id = m.id
      WHERE h.paciente_id = ?
      ORDER BY h.fecha DESC
    `, [id]);

    // Antecedentes
    const [antecedentes] = await db.query(`
      SELECT * FROM antecedentes_medicos
      WHERE paciente_id = ?
      ORDER BY categoria, condicion
    `, [id]);

    // Documentos
    const [documentos] = await db.query(`
      SELECT d.*, m.nombre as subido_por_nombre
      FROM documentos_paciente d
      LEFT JOIN medicos m ON d.subido_por = m.id
      WHERE d.paciente_id = ?
      ORDER BY d.fecha_subida DESC
    `, [id]);

    // Notas clínicas
    const [notas] = await db.query(`
      SELECT n.*, m.nombre as medico_nombre, m.apellido as medico_apellido
      FROM notas_clinicas n
      LEFT JOIN medicos m ON n.medico_id = m.id
      WHERE n.paciente_id = ?
      ORDER BY n.fecha_nota DESC
      LIMIT 20
    `, [id]);

    // Etiquetas
    const [etiquetas] = await db.query(`
      SELECT * FROM etiquetas_paciente
      WHERE paciente_id = ?
    `, [id]);

    // Signos vitales recientes
    const [signosVitales] = await db.query(`
      SELECT * FROM signos_vitales
      WHERE paciente_id = ?
      ORDER BY fecha_registro DESC
      LIMIT 10
    `, [id]);

    // Citas (últimas 5)
    const [citas] = await db.query(`
      SELECT c.*, m.nombre as medico_nombre, m.apellido as medico_apellido
      FROM citas c
      LEFT JOIN medicos m ON c.medico_id = m.id
      WHERE c.paciente_id = ?
      ORDER BY c.fecha DESC
      LIMIT 5
    `, [id]);

    res.json({
      success: true,
      data: {
        paciente: paciente[0],
        historial,
        antecedentes,
        documentos,
        notas,
        etiquetas,
        signosVitales,
        citas
      }
    });
  } catch (error) {
    console.error('Error al obtener paciente completo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del paciente'
    });
  }
};

// Crear paciente
const createPaciente = async (req, res) => {
  try {
    const datos = req.body;

    const [result] = await db.query(
      `INSERT INTO pacientes (
        nombre, apellido, email, telefono, fecha_nacimiento, genero, 
        direccion, ciudad, estado, codigo_postal, ocupacion, estado_civil,
        tipo_sangre, estatus, email_secundario, telefono_emergencia,
        contacto_emergencia_nombre, contacto_emergencia_relacion,
        seguro_medico, numero_poliza, notas_generales
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.nombre, datos.apellido, datos.email, datos.telefono, 
        datos.fecha_nacimiento, datos.genero, datos.direccion, datos.ciudad,
        datos.estado, datos.codigo_postal, datos.ocupacion, datos.estado_civil,
        datos.tipo_sangre, datos.estatus || 'activo', datos.email_secundario,
        datos.telefono_emergencia, datos.contacto_emergencia_nombre,
        datos.contacto_emergencia_relacion, datos.seguro_medico,
        datos.numero_poliza, datos.notas_generales
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Paciente creado exitosamente',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error al crear paciente:', error);
    res.status(500).json({ success: false, message: 'Error al crear paciente' });
  }
};

// Actualizar paciente
const updatePaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;

    // Construir query dinámicamente
    const campos = [];
    const valores = [];

    Object.keys(datos).forEach(key => {
      if (datos[key] !== undefined && key !== 'id') {
        campos.push(`${key} = ?`);
        valores.push(datos[key]);
      }
    });

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay datos para actualizar'
      });
    }

    valores.push(id);

    const [result] = await db.query(
      `UPDATE pacientes SET ${campos.join(', ')}, ultima_actualizacion = NOW() WHERE id = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    }

    res.json({ success: true, message: 'Paciente actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar paciente' });
  }
};

// Agregar entrada al historial médico
const agregarHistorial = async (req, res) => {
  try {
    const { paciente_id, fecha, tipo, titulo, descripcion, diagnostico, tratamiento, medicamentos, observaciones, medico_id } = req.body;

    const [result] = await db.query(`
      INSERT INTO historial_medico 
      (paciente_id, fecha, tipo, titulo, descripcion, medico_id, diagnostico, tratamiento, medicamentos, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [paciente_id, fecha, tipo, titulo, descripcion, medico_id, diagnostico, tratamiento, medicamentos, observaciones]);

    res.json({
      success: true,
      message: 'Entrada de historial agregada exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error al agregar historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar entrada al historial'
    });
  }
};

// Agregar antecedente médico
const agregarAntecedente = async (req, res) => {
  try {
    const { paciente_id, categoria, condicion, descripcion, fecha_diagnostico, estado, tratamiento_actual, notas } = req.body;

    const [result] = await db.query(`
      INSERT INTO antecedentes_medicos 
      (paciente_id, categoria, condicion, descripcion, fecha_diagnostico, estado, tratamiento_actual, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [paciente_id, categoria, condicion, descripcion, fecha_diagnostico, estado, tratamiento_actual, notas]);

    res.json({
      success: true,
      message: 'Antecedente agregado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error al agregar antecedente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar antecedente'
    });
  }
};

// Subir documento
const subirDocumento = async (req, res) => {
  try {
    const { paciente_id, tipo_documento, descripcion, fecha_documento, subido_por } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    const [result] = await db.query(`
      INSERT INTO documentos_paciente 
      (paciente_id, tipo_documento, nombre_archivo, ruta_archivo, descripcion, fecha_documento, tamano_archivo, tipo_mime, subido_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      paciente_id,
      tipo_documento,
      req.file.originalname,
      req.file.path,
      descripcion,
      fecha_documento,
      req.file.size,
      req.file.mimetype,
      subido_por
    ]);

    res.json({
      success: true,
      message: 'Documento subido exitosamente',
      id: result.insertId,
      archivo: {
        nombre: req.file.originalname,
        ruta: req.file.path,
        tamano: req.file.size
      }
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir documento'
    });
  }
};

// Agregar nota clínica
const agregarNota = async (req, res) => {
  try {
    const { paciente_id, medico_id, tipo_nota, titulo, contenido, importante, privada, cita_id } = req.body;

    const [result] = await db.query(`
      INSERT INTO notas_clinicas 
      (paciente_id, medico_id, cita_id, tipo_nota, titulo, contenido, importante, privada)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [paciente_id, medico_id, cita_id, tipo_nota, titulo, contenido, importante || false, privada || false]);

    res.json({
      success: true,
      message: 'Nota clínica agregada exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error al agregar nota:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar nota clínica'
    });
  }
};

// Agregar/quitar etiqueta
const gestionarEtiqueta = async (req, res) => {
  try {
    const { paciente_id, etiqueta, color, accion } = req.body;

    if (accion === 'agregar') {
      await db.query(`
        INSERT INTO etiquetas_paciente (paciente_id, etiqueta, color)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE color = VALUES(color)
      `, [paciente_id, etiqueta, color || '#667eea']);

      res.json({
        success: true,
        message: 'Etiqueta agregada exitosamente'
      });
    } else if (accion === 'quitar') {
      await db.query(`
        DELETE FROM etiquetas_paciente 
        WHERE paciente_id = ? AND etiqueta = ?
      `, [paciente_id, etiqueta]);

      res.json({
        success: true,
        message: 'Etiqueta eliminada exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Acción no válida'
      });
    }
  } catch (error) {
    console.error('Error al gestionar etiqueta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al gestionar etiqueta'
    });
  }
};

// Registrar signos vitales
const registrarSignosVitales = async (req, res) => {
  try {
    const { paciente_id, cita_id, peso, altura, temperatura, presion_sistolica, presion_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, saturacion_oxigeno, glucosa, notas } = req.body;

    // Calcular IMC si hay peso y altura
    let imc = null;
    if (peso && altura) {
      imc = (peso / ((altura / 100) ** 2)).toFixed(2);
    }

    const [result] = await db.query(`
      INSERT INTO signos_vitales 
      (paciente_id, cita_id, peso, altura, imc, temperatura, presion_sistolica, presion_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, saturacion_oxigeno, glucosa, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [paciente_id, cita_id, peso, altura, imc, temperatura, presion_sistolica, presion_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, saturacion_oxigeno, glucosa, notas]);

    res.json({
      success: true,
      message: 'Signos vitales registrados exitosamente',
      id: result.insertId,
      imc
    });
  } catch (error) {
    console.error('Error al registrar signos vitales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar signos vitales'
    });
  }
};

module.exports = {
  getAllPacientes,
  getPacienteById,
  createPaciente,
  updatePaciente,
  agregarHistorial,
  agregarAntecedente,
  subirDocumento,
  agregarNota,
  gestionarEtiqueta,
  registrarSignosVitales,
  upload
};
