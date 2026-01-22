const db = require('../config/database');
const { enviarMensajeWhatsApp } = require('../services/whatsapp.service');

/**
 * Formatear fecha YYYY-MM-DD a formato legible sin conversión UTC
 */
const formatearFechaCompleta = (fechaStr) => {
  const [year, month, day] = fechaStr.split('-');
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`;
};

/**
 * Crear una notificación
 */
const crearNotificacion = async (tipo, titulo, mensaje, usuarioId, usuarioTipo, citaId = null, recetaId = null) => {
  try {
    console.log('🔔 Creando notificación:', { tipo, titulo, usuarioId, usuarioTipo, citaId });
    
    const [result] = await db.query(
      `INSERT INTO notificaciones (tipo, titulo, mensaje, usuario_id, usuario_tipo, cita_id, receta_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tipo, titulo, mensaje, usuarioId, usuarioTipo, citaId, recetaId]
    );
    
    console.log('✅ Notificación creada con ID:', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('❌ Error al crear notificación:', error);
    throw error;
  }
};

/**
 * Obtener notificaciones de un usuario
 */
const getNotificaciones = async (req, res) => {
  try {
    const { usuarioId, usuarioTipo } = req.params;
    const { soloNoLeidas } = req.query;

    let query = `
      SELECT n.*, 
        CASE 
          WHEN n.cita_id IS NOT NULL THEN (
            SELECT JSON_OBJECT(
              'id', c.id,
              'fecha', c.fecha,
              'hora_inicio', c.hora_inicio,
              'estado', c.estado,
              'paciente', JSON_OBJECT('nombre', p.nombre, 'apellido', p.apellido)
            )
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            WHERE c.id = n.cita_id
          )
          ELSE NULL
        END as cita_info
      FROM notificaciones n
      WHERE n.usuario_id = ? AND n.usuario_tipo = ?
    `;

    if (soloNoLeidas === 'true') {
      query += ' AND n.leida = FALSE';
    }

    query += ' ORDER BY n.fecha_creacion DESC LIMIT 50';

    const [notificaciones] = await db.query(query, [usuarioId, usuarioTipo]);

    // cita_info ya viene como objeto desde MySQL con JSON_OBJECT()
    res.json({
      success: true,
      data: notificaciones
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones'
    });
  }
};

/**
 * Marcar notificación como leída
 */
const marcarComoLeida = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE notificaciones SET leida = TRUE WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Notificación marcada como leída'
    });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación'
    });
  }
};

/**
 * Marcar todas como leídas
 */
const marcarTodasComoLeidas = async (req, res) => {
  try {
    const { usuarioId, usuarioTipo } = req.params;

    await db.query(
      'UPDATE notificaciones SET leida = TRUE WHERE usuario_id = ? AND usuario_tipo = ?',
      [usuarioId, usuarioTipo]
    );

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones'
    });
  }
};

/**
 * Aceptar o rechazar cita
 */
const actualizarEstadoCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, motivo_rechazo } = req.body;

    // Validar estado
    if (!['confirmada', 'rechazada'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    // Obtener información de la cita
    const [citas] = await db.query(
      `SELECT c.*, p.nombre as paciente_nombre, p.apellido as paciente_apellido, 
              p.telefono as paciente_telefono, p.email as paciente_email,
              m.nombre as medico_nombre, m.apellido as medico_apellido
       FROM citas c
       JOIN pacientes p ON c.paciente_id = p.id
       JOIN medicos m ON c.medico_id = m.id
       WHERE c.id = ?`,
      [id]
    );

    if (citas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    const cita = citas[0];

    // Actualizar estado de la cita
    await db.query(
      'UPDATE citas SET estado = ?, motivo_rechazo = ? WHERE id = ?',
      [estado, motivo_rechazo || null, id]
    );

    // Crear notificación para el paciente
    // Formatear fecha sin conversión UTC
    // cita.fecha puede venir como Date object de MySQL, convertir a string primero
    const fechaStr = cita.fecha instanceof Date 
      ? cita.fecha.toISOString().split('T')[0] 
      : cita.fecha.toString().split('T')[0];
    const [year, month, day] = fechaStr.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;
    
    const titulo = estado === 'confirmada' 
      ? '✅ Cita Confirmada' 
      : '❌ Cita Rechazada';
    
    const mensaje = estado === 'confirmada'
      ? `Tu cita del ${fechaFormateada} a las ${cita.hora_inicio} ha sido confirmada.`
      : `Tu cita del ${fechaFormateada} ha sido rechazada. ${motivo_rechazo ? 'Motivo: ' + motivo_rechazo : ''}`;

    await crearNotificacion(
      estado === 'confirmada' ? 'cita_aceptada' : 'cita_rechazada',
      titulo,
      mensaje,
      cita.paciente_id,
      'paciente',
      id
    );

    // Enviar WhatsApp al paciente
    const mensajeWhatsApp = `🏥 *${titulo}*

Hola ${cita.paciente_nombre} ${cita.paciente_apellido},

${mensaje}

👨‍⚕️ *Doctor:* ${cita.medico_nombre} ${cita.medico_apellido}
📅 *Fecha:* ${formatearFechaCompleta(fechaStr)}
🕐 *Hora:* ${cita.hora_inicio.substring(0, 5)} - ${cita.hora_fin.substring(0, 5)}
${estado === 'confirmada' ? '🔑 *Código:* ' + cita.codigo_confirmacion : ''}

_Este mensaje fue generado automáticamente._`;

    console.log('📱 Intentando enviar WhatsApp a:', cita.paciente_telefono);
    console.log('📝 Mensaje:', mensajeWhatsApp);

    try {
      const whatsappResult = await enviarMensajeWhatsApp(cita.paciente_telefono, mensajeWhatsApp);
      console.log('✅ Resultado WhatsApp:', whatsappResult);
    } catch (whatsappError) {
      console.error('❌ Error al enviar WhatsApp:', whatsappError);
    }

    res.json({
      success: true,
      message: `Cita ${estado === 'confirmada' ? 'aceptada' : 'rechazada'} exitosamente`,
      data: { estado }
    });
  } catch (error) {
    console.error('Error al actualizar estado de cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado de cita'
    });
  }
};

/**
 * Eliminar una notificación específica
 */
const eliminarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM notificaciones WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Notificación eliminada'
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación'
    });
  }
};

/**
 * Eliminar todas las notificaciones leídas
 */
const eliminarLeidas = async (req, res) => {
  try {
    const { usuarioId, usuarioTipo } = req.params;

    const [result] = await db.query(
      'DELETE FROM notificaciones WHERE usuario_id = ? AND usuario_tipo = ? AND leida = TRUE',
      [usuarioId, usuarioTipo]
    );

    res.json({
      success: true,
      message: `${result.affectedRows} notificación(es) eliminada(s)`,
      eliminadas: result.affectedRows
    });
  } catch (error) {
    console.error('Error al eliminar notificaciones leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificaciones'
    });
  }
};

/**
 * Eliminar todas las notificaciones
 */
const eliminarTodas = async (req, res) => {
  try {
    const { usuarioId, usuarioTipo } = req.params;

    const [result] = await db.query(
      'DELETE FROM notificaciones WHERE usuario_id = ? AND usuario_tipo = ?',
      [usuarioId, usuarioTipo]
    );

    res.json({
      success: true,
      message: `${result.affectedRows} notificación(es) eliminada(s)`,
      eliminadas: result.affectedRows
    });
  } catch (error) {
    console.error('Error al eliminar todas las notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificaciones'
    });
  }
};

module.exports = {
  crearNotificacion,
  getNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
  actualizarEstadoCita,
  eliminarNotificacion,
  eliminarLeidas,
  eliminarTodas
};
