const db = require('../config/database');

// ============================================
// CONFIGURACIÓN GENERAL DEL CONSULTORIO
// ============================================

// Obtener configuración del consultorio
const getConfiguracion = async (req, res) => {
  const { medicoId } = req.params;
  
  try {
    const [configuracion] = await db.query(
      'SELECT * FROM configuracion_consultorio WHERE medico_id = ?',
      [medicoId]
    );

    if (configuracion.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay configuración. Se creará al guardar.'
      });
    }

    res.json({
      success: true,
      data: configuracion[0]
    });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración'
    });
  }
};

// Crear o actualizar configuración del consultorio
const upsertConfiguracion = async (req, res) => {
  const { medicoId } = req.params;
  const configuracion = req.body;
  
  try {
    // Verificar si existe configuración
    const [existing] = await db.query(
      'SELECT id FROM configuracion_consultorio WHERE medico_id = ?',
      [medicoId]
    );

    if (existing.length > 0) {
      // Actualizar
      const updateFields = Object.keys(configuracion)
        .filter(key => key !== 'id' && key !== 'medico_id')
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.keys(configuracion)
        .filter(key => key !== 'id' && key !== 'medico_id')
        .map(key => configuracion[key]);
      
      values.push(medicoId);

      await db.query(
        `UPDATE configuracion_consultorio SET ${updateFields} WHERE medico_id = ?`,
        values
      );

      res.json({
        success: true,
        message: 'Configuración actualizada correctamente'
      });
    } else {
      // Crear
      configuracion.medico_id = medicoId;
      
      const fields = Object.keys(configuracion).join(', ');
      const placeholders = Object.keys(configuracion).map(() => '?').join(', ');
      const values = Object.values(configuracion);

      await db.query(
        `INSERT INTO configuracion_consultorio (${fields}) VALUES (${placeholders})`,
        values
      );

      res.json({
        success: true,
        message: 'Configuración creada correctamente'
      });
    }
  } catch (error) {
    console.error('Error guardando configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar configuración'
    });
  }
};

// ============================================
// TIPOS DE CONSULTA
// ============================================

// Obtener tipos de consulta
const getTiposConsulta = async (req, res) => {
  const { medicoId } = req.params;
  
  try {
    const [tipos] = await db.query(
      'SELECT * FROM tipos_consulta WHERE medico_id = ? ORDER BY orden, nombre',
      [medicoId]
    );

    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    console.error('Error obteniendo tipos de consulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de consulta'
    });
  }
};

// Crear tipo de consulta
const createTipoConsulta = async (req, res) => {
  const { medicoId } = req.params;
  const tipo = req.body;
  
  try {
    tipo.medico_id = medicoId;
    
    const [result] = await db.query(
      `INSERT INTO tipos_consulta (medico_id, nombre, descripcion, duracion_minutos, precio, color, activo, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tipo.medico_id,
        tipo.nombre,
        tipo.descripcion || null,
        tipo.duracion_minutos || 30,
        tipo.precio || null,
        tipo.color || '#3B82F6',
        tipo.activo !== false,
        tipo.orden || 0
      ]
    );

    res.json({
      success: true,
      message: 'Tipo de consulta creado',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creando tipo de consulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear tipo de consulta'
    });
  }
};

// Actualizar tipo de consulta
const updateTipoConsulta = async (req, res) => {
  const { id } = req.params;
  const tipo = req.body;
  
  try {
    await db.query(
      `UPDATE tipos_consulta 
       SET nombre = ?, descripcion = ?, duracion_minutos = ?, precio = ?, color = ?, activo = ?, orden = ?
       WHERE id = ?`,
      [
        tipo.nombre,
        tipo.descripcion || null,
        tipo.duracion_minutos || 30,
        tipo.precio || null,
        tipo.color || '#3B82F6',
        tipo.activo !== false,
        tipo.orden || 0,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Tipo de consulta actualizado'
    });
  } catch (error) {
    console.error('Error actualizando tipo de consulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar tipo de consulta'
    });
  }
};

// Eliminar tipo de consulta
const deleteTipoConsulta = async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('DELETE FROM tipos_consulta WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Tipo de consulta eliminado'
    });
  } catch (error) {
    console.error('Error eliminando tipo de consulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar tipo de consulta'
    });
  }
};

// ============================================
// ESPECIALIDADES
// ============================================

// Obtener especialidades del médico
const getEspecialidades = async (req, res) => {
  const { medicoId } = req.params;
  
  try {
    const [especialidades] = await db.query(
      'SELECT * FROM especialidades_medico WHERE medico_id = ? ORDER BY es_principal DESC, anio_obtencion DESC',
      [medicoId]
    );

    res.json({
      success: true,
      data: especialidades
    });
  } catch (error) {
    console.error('Error obteniendo especialidades:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener especialidades'
    });
  }
};

// Crear especialidad
const createEspecialidad = async (req, res) => {
  const { medicoId } = req.params;
  const especialidad = req.body;
  
  try {
    const [result] = await db.query(
      `INSERT INTO especialidades_medico (medico_id, especialidad, subespecialidad, institucion, anio_obtencion, cedula, es_principal)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        medicoId,
        especialidad.especialidad,
        especialidad.subespecialidad || null,
        especialidad.institucion || null,
        especialidad.anio_obtencion || null,
        especialidad.cedula || null,
        especialidad.es_principal || false
      ]
    );

    res.json({
      success: true,
      message: 'Especialidad agregada',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creando especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar especialidad'
    });
  }
};

// Actualizar especialidad
const updateEspecialidad = async (req, res) => {
  const { id } = req.params;
  const especialidad = req.body;
  
  try {
    await db.query(
      `UPDATE especialidades_medico 
       SET especialidad = ?, subespecialidad = ?, institucion = ?, anio_obtencion = ?, cedula = ?, es_principal = ?
       WHERE id = ?`,
      [
        especialidad.especialidad,
        especialidad.subespecialidad || null,
        especialidad.institucion || null,
        especialidad.anio_obtencion || null,
        especialidad.cedula || null,
        especialidad.es_principal || false,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Especialidad actualizada'
    });
  } catch (error) {
    console.error('Error actualizando especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar especialidad'
    });
  }
};

// Eliminar especialidad
const deleteEspecialidad = async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('DELETE FROM especialidades_medico WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Especialidad eliminada'
    });
  } catch (error) {
    console.error('Error eliminando especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar especialidad'
    });
  }
};

// ============================================
// MÉTODOS DE PAGO
// ============================================

// Obtener métodos de pago
const getMetodosPago = async (req, res) => {
  const { medicoId } = req.params;
  
  try {
    const [metodos] = await db.query(
      'SELECT * FROM metodos_pago WHERE medico_id = ? ORDER BY orden',
      [medicoId]
    );

    res.json({
      success: true,
      data: metodos
    });
  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métodos de pago'
    });
  }
};

// Crear método de pago
const createMetodoPago = async (req, res) => {
  const { medicoId } = req.params;
  const metodo = req.body;
  
  try {
    const [result] = await db.query(
      `INSERT INTO metodos_pago (medico_id, metodo, descripcion, activo, orden)
       VALUES (?, ?, ?, ?, ?)`,
      [
        medicoId,
        metodo.metodo,
        metodo.descripcion || null,
        metodo.activo !== false,
        metodo.orden || 0
      ]
    );

    res.json({
      success: true,
      message: 'Método de pago agregado',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creando método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar método de pago'
    });
  }
};

// Actualizar método de pago
const updateMetodoPago = async (req, res) => {
  const { id } = req.params;
  const metodo = req.body;
  
  try {
    await db.query(
      `UPDATE metodos_pago 
       SET metodo = ?, descripcion = ?, activo = ?, orden = ?
       WHERE id = ?`,
      [
        metodo.metodo,
        metodo.descripcion || null,
        metodo.activo !== false,
        metodo.orden || 0,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Método de pago actualizado'
    });
  } catch (error) {
    console.error('Error actualizando método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar método de pago'
    });
  }
};

// Eliminar método de pago
const deleteMetodoPago = async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('DELETE FROM metodos_pago WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Método de pago eliminado'
    });
  } catch (error) {
    console.error('Error eliminando método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar método de pago'
    });
  }
};

// ============================================
// DÍAS FESTIVOS
// ============================================

// Obtener días festivos
const getDiasFestivos = async (req, res) => {
  const { medicoId } = req.params;
  
  try {
    const [dias] = await db.query(
      'SELECT * FROM dias_festivos WHERE medico_id = ? ORDER BY fecha',
      [medicoId]
    );

    res.json({
      success: true,
      data: dias
    });
  } catch (error) {
    console.error('Error obteniendo días festivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener días festivos'
    });
  }
};

// Crear día festivo
const createDiaFestivo = async (req, res) => {
  const { medicoId } = req.params;
  const dia = req.body;
  
  try {
    const [result] = await db.query(
      `INSERT INTO dias_festivos (medico_id, fecha, nombre, descripcion, recurrente)
       VALUES (?, ?, ?, ?, ?)`,
      [
        medicoId,
        dia.fecha,
        dia.nombre,
        dia.descripcion || null,
        dia.recurrente || false
      ]
    );

    res.json({
      success: true,
      message: 'Día festivo agregado',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creando día festivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar día festivo'
    });
  }
};

// Eliminar día festivo
const deleteDiaFestivo = async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('DELETE FROM dias_festivos WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Día festivo eliminado'
    });
  } catch (error) {
    console.error('Error eliminando día festivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar día festivo'
    });
  }
};

module.exports = {
  getConfiguracion,
  upsertConfiguracion,
  getTiposConsulta,
  createTipoConsulta,
  updateTipoConsulta,
  deleteTipoConsulta,
  getEspecialidades,
  createEspecialidad,
  updateEspecialidad,
  deleteEspecialidad,
  getMetodosPago,
  createMetodoPago,
  updateMetodoPago,
  deleteMetodoPago,
  getDiasFestivos,
  createDiaFestivo,
  deleteDiaFestivo
};
