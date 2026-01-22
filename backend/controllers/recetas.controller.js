const db = require('../config/database');

// Generar folio único para la receta
const generarFolio = () => {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().substr(-2);
  const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RX${year}${month}-${random}`;
};

// Crear receta médica
const createReceta = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      cita_id,
      medico_id,
      paciente_id,
      diagnostico,
      indicaciones,
      vigencia_dias,
      medicamentos
    } = req.body;

    const folio = generarFolio();
    const fecha_emision = new Date().toISOString().split('T')[0];

    // Crear receta
    const [recetaResult] = await connection.query(
      'INSERT INTO recetas_medicas (cita_id, medico_id, paciente_id, fecha_emision, diagnostico, indicaciones, vigencia_dias, folio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [cita_id, medico_id, paciente_id, fecha_emision, diagnostico, indicaciones, vigencia_dias || 30, folio]
    );

    const recetaId = recetaResult.insertId;

    // Insertar medicamentos
    if (medicamentos && medicamentos.length > 0) {
      for (let i = 0; i < medicamentos.length; i++) {
        const med = medicamentos[i];
        await connection.query(
          `INSERT INTO medicamentos_receta 
          (receta_id, medicamento, presentacion, dosis, frecuencia, duracion, cantidad, via_administracion, indicaciones_especiales, orden) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [recetaId, med.medicamento, med.presentacion, med.dosis, med.frecuencia, med.duracion, med.cantidad, med.via_administracion || 'oral', med.indicaciones_especiales, i + 1]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Receta creada exitosamente',
      data: { id: recetaId, folio }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear receta:', error);
    res.status(500).json({ success: false, message: 'Error al crear receta' });
  } finally {
    connection.release();
  }
};

// Obtener recetas por médico
const getRecetasByMedico = async (req, res) => {
  try {
    const { medico_id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    let query = `
      SELECT r.*, 
             p.nombre as paciente_nombre, 
             p.apellido as paciente_apellido,
             p.email as paciente_email,
             (SELECT COUNT(*) FROM medicamentos_receta WHERE receta_id = r.id) as total_medicamentos
      FROM recetas_medicas r
      JOIN pacientes p ON r.paciente_id = p.id
      WHERE r.medico_id = ?
    `;

    const params = [medico_id];

    if (fecha_inicio && fecha_fin) {
      query += ' AND r.fecha_emision BETWEEN ? AND ?';
      params.push(fecha_inicio, fecha_fin);
    }

    query += ' ORDER BY r.fecha_emision DESC';

    const [recetas] = await db.query(query, params);
    
    // Agregar medicamentos como array con la cantidad
    recetas.forEach(receta => {
      receta.medicamentos = new Array(receta.total_medicamentos);
    });

    res.json({ success: true, data: recetas });
  } catch (error) {
    console.error('Error al obtener recetas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener recetas' });
  }
};

// Obtener receta por ID con medicamentos
const getRecetaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [recetas] = await db.query(
      `SELECT r.*, 
              m.nombre as medico_nombre, 
              m.apellido as medico_apellido,
              m.especialidad,
              m.cedula_profesional,
              m.telefono as medico_telefono,
              m.email as medico_email,
              p.nombre as paciente_nombre, 
              p.apellido as paciente_apellido,
              p.fecha_nacimiento as paciente_fecha_nacimiento,
              p.genero as paciente_genero,
              p.telefono as paciente_telefono,
              p.email as paciente_email
       FROM recetas_medicas r
       JOIN medicos m ON r.medico_id = m.id
       JOIN pacientes p ON r.paciente_id = p.id
       WHERE r.id = ?`,
      [id]
    );

    if (recetas.length === 0) {
      return res.status(404).json({ success: false, message: 'Receta no encontrada' });
    }

    const receta = recetas[0];

    // Obtener medicamentos
    const [medicamentos] = await db.query(
      'SELECT * FROM medicamentos_receta WHERE receta_id = ? ORDER BY orden',
      [id]
    );

    receta.medicamentos = medicamentos;

    res.json({ success: true, data: receta });
  } catch (error) {
    console.error('Error al obtener receta:', error);
    res.status(500).json({ success: false, message: 'Error al obtener receta' });
  }
};

// Obtener receta por folio
const getRecetaByFolio = async (req, res) => {
  try {
    const { folio } = req.params;

    const [recetas] = await db.query(
      `SELECT r.*, 
              m.nombre as medico_nombre, 
              m.apellido as medico_apellido,
              m.especialidad,
              m.cedula_profesional,
              p.nombre as paciente_nombre, 
              p.apellido as paciente_apellido
       FROM recetas_medicas r
       JOIN medicos m ON r.medico_id = m.id
       JOIN pacientes p ON r.paciente_id = p.id
       WHERE r.folio = ?`,
      [folio]
    );

    if (recetas.length === 0) {
      return res.status(404).json({ success: false, message: 'Receta no encontrada' });
    }

    const receta = recetas[0];

    // Obtener medicamentos
    const [medicamentos] = await db.query(
      'SELECT * FROM medicamentos_receta WHERE receta_id = ? ORDER BY orden',
      [receta.id]
    );

    receta.medicamentos = medicamentos;

    res.json({ success: true, data: receta });
  } catch (error) {
    console.error('Error al obtener receta:', error);
    res.status(500).json({ success: false, message: 'Error al obtener receta' });
  }
};

module.exports = {
  createReceta,
  getRecetasByMedico,
  getRecetaById,
  getRecetaByFolio
};
