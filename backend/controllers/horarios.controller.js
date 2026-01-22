const db = require('../config/database');

// Obtener horarios de un médico
const getHorariosByMedico = async (req, res) => {
  try {
    const { medico_id } = req.params;
    
    const [horarios] = await db.query(
      'SELECT * FROM configuracion_horarios WHERE medico_id = ? AND activo = TRUE ORDER BY FIELD(dia_semana, "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"), hora_inicio',
      [medico_id]
    );

    res.json({ success: true, data: horarios });
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    res.status(500).json({ success: false, message: 'Error al obtener horarios' });
  }
};

// Crear horario
const createHorario = async (req, res) => {
  try {
    const { medico_id, dia_semana, hora_inicio, hora_fin, duracion_cita_minutos, tiempo_entre_citas_minutos } = req.body;

    const [result] = await db.query(
      'INSERT INTO configuracion_horarios (medico_id, dia_semana, hora_inicio, hora_fin, duracion_cita_minutos, tiempo_entre_citas_minutos) VALUES (?, ?, ?, ?, ?, ?)',
      [medico_id, dia_semana, hora_inicio, hora_fin, duracion_cita_minutos || 30, tiempo_entre_citas_minutos || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Horario creado exitosamente',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error al crear horario:', error);
    res.status(500).json({ success: false, message: 'Error al crear horario' });
  }
};

// Actualizar horario
const updateHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const { dia_semana, hora_inicio, hora_fin, duracion_cita_minutos, tiempo_entre_citas_minutos, activo } = req.body;

    const [result] = await db.query(
      'UPDATE configuracion_horarios SET dia_semana = ?, hora_inicio = ?, hora_fin = ?, duracion_cita_minutos = ?, tiempo_entre_citas_minutos = ?, activo = ? WHERE id = ?',
      [dia_semana, hora_inicio, hora_fin, duracion_cita_minutos, tiempo_entre_citas_minutos, activo, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado' });
    }

    res.json({ success: true, message: 'Horario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar horario' });
  }
};

// Eliminar horario
const deleteHorario = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM configuracion_horarios WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado' });
    }

    res.json({ success: true, message: 'Horario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar horario' });
  }
};

// Obtener días no laborables
const getDiasNoLaborables = async (req, res) => {
  try {
    const { medico_id } = req.params;
    
    const [dias] = await db.query(
      'SELECT * FROM dias_no_laborables WHERE medico_id = ? AND fecha >= CURDATE() ORDER BY fecha',
      [medico_id]
    );

    res.json({ success: true, data: dias });
  } catch (error) {
    console.error('Error al obtener días no laborables:', error);
    res.status(500).json({ success: false, message: 'Error al obtener días no laborables' });
  }
};

// Crear día no laborable
const createDiaNoLaborable = async (req, res) => {
  try {
    const { medico_id, fecha, motivo, todo_el_dia, hora_inicio, hora_fin } = req.body;

    const [result] = await db.query(
      'INSERT INTO dias_no_laborables (medico_id, fecha, motivo, todo_el_dia, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?, ?)',
      [medico_id, fecha, motivo, todo_el_dia, hora_inicio, hora_fin]
    );

    res.status(201).json({
      success: true,
      message: 'Día no laborable creado exitosamente',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error al crear día no laborable:', error);
    res.status(500).json({ success: false, message: 'Error al crear día no laborable' });
  }
};

// Eliminar día no laborable
const deleteDiaNoLaborable = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM dias_no_laborables WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Día no laborable no encontrado' });
    }

    res.json({ success: true, message: 'Día no laborable eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar día no laborable:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar día no laborable' });
  }
};

module.exports = {
  getHorariosByMedico,
  createHorario,
  updateHorario,
  deleteHorario,
  getDiasNoLaborables,
  createDiaNoLaborable,
  deleteDiaNoLaborable
};
