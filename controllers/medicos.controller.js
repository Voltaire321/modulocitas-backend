const db = require('../config/database');

// Obtener información del médico único del sistema
const getMedicoInfo = async (req, res) => {
  console.log('🔍 getMedicoInfo - Iniciando...');
  try {
    console.log('📊 Ejecutando query a base de datos...');
    const [medicos] = await db.query(
      'SELECT id, nombre, apellido, especialidad, email, telefono, cedula_profesional, foto_url FROM medicos WHERE activo = TRUE LIMIT 1'
    );
    
    console.log('✅ Query exitosa. Médicos encontrados:', medicos.length);
    console.log('📋 Datos:', JSON.stringify(medicos, null, 2));

    if (medicos.length === 0) {
      console.log('⚠️ No hay médico configurado');
      return res.status(404).json({ success: false, message: 'No hay médico configurado en el sistema' });
    }

    console.log('✅ Enviando respuesta con médico:', medicos[0].id);
    res.json({ success: true, data: medicos[0] });
  } catch (error) {
    console.error('❌ ERROR en getMedicoInfo:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Error al obtener información del médico' });
  }
};

// Actualizar información del médico único
const updateMedicoInfo = async (req, res) => {
  try {
    const { nombre, apellido, especialidad, email, telefono, cedula_profesional } = req.body;

    // Obtener el ID del médico activo
    const [medicos] = await db.query('SELECT id FROM medicos WHERE activo = TRUE LIMIT 1');
    
    if (medicos.length === 0) {
      return res.status(404).json({ success: false, message: 'No hay médico configurado en el sistema' });
    }

    const medicoId = medicos[0].id;

    await db.query(
      `UPDATE medicos 
       SET nombre = ?, apellido = ?, especialidad = ?, email = ?, telefono = ?, cedula_profesional = ?
       WHERE id = ?`,
      [nombre, apellido, especialidad, email, telefono, cedula_profesional, medicoId]
    );

    res.json({ success: true, message: 'Información actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar médico:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar información del médico' });
  }
};

module.exports = {
  getMedicoInfo,
  updateMedicoInfo
};
