const db = require('../config/database');

// Dashboard: estadísticas generales
const getDashboardStats = async (req, res) => {
  try {
    const { medico_id } = req.query;

    // Citas del día
    const [citasHoy] = await db.query(
      `SELECT COUNT(*) as total FROM citas 
       WHERE medico_id = ? AND fecha = CURDATE() AND estado NOT IN ('cancelada', 'rechazada')`,
      [medico_id]
    );

    // Citas pendientes
    const [citasPendientes] = await db.query(
      `SELECT COUNT(*) as total FROM citas 
       WHERE medico_id = ? AND estado = 'pendiente' AND fecha >= CURDATE()`,
      [medico_id]
    );

    // Citas confirmadas próximas
    const [citasConfirmadas] = await db.query(
      `SELECT COUNT(*) as total FROM citas 
       WHERE medico_id = ? AND estado = 'confirmada' AND fecha >= CURDATE()`,
      [medico_id]
    );

    // Citas de la semana
    const [citasSemana] = await db.query(
      `SELECT COUNT(*) as total FROM citas 
       WHERE medico_id = ? 
       AND fecha BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       AND estado NOT IN ('cancelada', 'rechazada')`,
      [medico_id]
    );

    // Citas del mes
    const [citasMes] = await db.query(
      `SELECT COUNT(*) as total FROM citas 
       WHERE medico_id = ? 
       AND MONTH(fecha) = MONTH(CURDATE()) 
       AND YEAR(fecha) = YEAR(CURDATE())
       AND estado NOT IN ('cancelada', 'rechazada')`,
      [medico_id]
    );

    // Pacientes únicos del mes
    const [pacientesMes] = await db.query(
      `SELECT COUNT(DISTINCT paciente_id) as total FROM citas 
       WHERE medico_id = ? 
       AND MONTH(fecha) = MONTH(CURDATE()) 
       AND YEAR(fecha) = YEAR(CURDATE())`,
      [medico_id]
    );

    res.json({
      success: true,
      data: {
        citasHoy: citasHoy[0].total,
        citasPendientes: citasPendientes[0].total,
        citasConfirmadas: citasConfirmadas[0].total,
        citasSemana: citasSemana[0].total,
        citasMes: citasMes[0].total,
        pacientesMes: pacientesMes[0].total
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
};

// Obtener configuración del sistema
const getConfiguracion = async (req, res) => {
  try {
    const { medico_id } = req.query;

    const [configuraciones] = await db.query(
      'SELECT * FROM configuracion_sistema WHERE medico_id = ?',
      [medico_id]
    );

    const config = {};
    configuraciones.forEach(c => {
      let valor = c.valor;
      if (c.tipo === 'boolean') {
        valor = c.valor === 'true' || c.valor === '1';
      } else if (c.tipo === 'number') {
        valor = parseFloat(c.valor);
      } else if (c.tipo === 'json') {
        valor = JSON.parse(c.valor);
      }
      config[c.clave] = valor;
    });

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ success: false, message: 'Error al obtener configuración' });
  }
};

// Actualizar configuración
const updateConfiguracion = async (req, res) => {
  try {
    const { medico_id, configuraciones } = req.body;

    for (const [clave, valor] of Object.entries(configuraciones)) {
      let tipo = 'string';
      let valorStr = String(valor);

      if (typeof valor === 'boolean') {
        tipo = 'boolean';
        valorStr = valor ? 'true' : 'false';
      } else if (typeof valor === 'number') {
        tipo = 'number';
      } else if (typeof valor === 'object') {
        tipo = 'json';
        valorStr = JSON.stringify(valor);
      }

      await db.query(
        `INSERT INTO configuracion_sistema (medico_id, clave, valor, tipo) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE valor = ?, tipo = ?`,
        [medico_id, clave, valorStr, tipo, valorStr, tipo]
      );
    }

    res.json({ success: true, message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar configuración' });
  }
};

module.exports = {
  getDashboardStats,
  getConfiguracion,
  updateConfiguracion
};
