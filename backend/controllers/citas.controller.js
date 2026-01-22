const db = require('../config/database');
const { enviarMensajeWhatsApp, generarMensajeConfirmacionCita } = require('../services/whatsapp.service');
const { crearNotificacion } = require('./notificaciones.controller');
const googleCalendarService = require('../services/google-calendar.service');

// Generar código de confirmación único
const generateConfirmationCode = () => {
  return Math.random().toString(36).substring(2, 12).toUpperCase();
};

// Obtener todas las citas
const getAllCitas = async (req, res) => {
  try {
    const { medico_id, fecha_inicio, fecha_fin, estado } = req.query;
    
    let query = `
      SELECT c.*, 
             p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.email as paciente_email, p.telefono as paciente_telefono,
             m.nombre as medico_nombre, m.apellido as medico_apellido, m.especialidad
      FROM citas c
      INNER JOIN pacientes p ON c.paciente_id = p.id
      INNER JOIN medicos m ON c.medico_id = m.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (medico_id) {
      query += ' AND c.medico_id = ?';
      params.push(medico_id);
    }
    
    if (fecha_inicio) {
      query += ' AND c.fecha >= ?';
      params.push(fecha_inicio);
    }
    
    if (fecha_fin) {
      query += ' AND c.fecha <= ?';
      params.push(fecha_fin);
    }
    
    if (estado) {
      query += ' AND c.estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY c.fecha DESC, c.hora_inicio DESC';
    
    const [citas] = await db.query(query, params);
    res.json({ success: true, data: citas });
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener citas' });
  }
};

// Obtener cita por ID
const getCitaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [citas] = await db.query(`
      SELECT c.*, 
             p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.email as paciente_email, p.telefono as paciente_telefono,
             m.nombre as medico_nombre, m.apellido as medico_apellido, m.especialidad
      FROM citas c
      INNER JOIN pacientes p ON c.paciente_id = p.id
      INNER JOIN medicos m ON c.medico_id = m.id
      WHERE c.id = ?
    `, [id]);

    if (citas.length === 0) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }

    res.json({ success: true, data: citas[0] });
  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({ success: false, message: 'Error al obtener cita' });
  }
};

// Crear cita
const createCita = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { 
      medico_id, 
      paciente_nombre, 
      paciente_apellido, 
      paciente_email, 
      paciente_telefono, 
      fecha, 
      hora_inicio, 
      hora_fin, 
      motivo_consulta,
      notas_paciente 
    } = req.body;

    // Verificar disponibilidad
    const [citasExistentes] = await connection.query(
      `SELECT id FROM citas 
       WHERE medico_id = ? 
       AND fecha = ? 
       AND estado NOT IN ('cancelada', 'rechazada')
       AND (
         (hora_inicio < ? AND hora_fin > ?) OR
         (hora_inicio < ? AND hora_fin > ?) OR
         (hora_inicio >= ? AND hora_fin <= ?)
       )`,
      [medico_id, fecha, hora_fin, hora_inicio, hora_fin, hora_inicio, hora_inicio, hora_fin]
    );

    if (citasExistentes.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'El horario seleccionado no está disponible' 
      });
    }

    // Buscar o crear paciente
    let paciente_id;
    const [pacientesExistentes] = await connection.query(
      'SELECT id FROM pacientes WHERE email = ? OR telefono = ?',
      [paciente_email, paciente_telefono]
    );

    if (pacientesExistentes.length > 0) {
      paciente_id = pacientesExistentes[0].id;
      // Actualizar información del paciente
      await connection.query(
        'UPDATE pacientes SET nombre = ?, apellido = ?, email = ?, telefono = ? WHERE id = ?',
        [paciente_nombre, paciente_apellido, paciente_email, paciente_telefono, paciente_id]
      );
    } else {
      const [resultPaciente] = await connection.query(
        'INSERT INTO pacientes (nombre, apellido, email, telefono) VALUES (?, ?, ?, ?)',
        [paciente_nombre, paciente_apellido, paciente_email, paciente_telefono]
      );
      paciente_id = resultPaciente.insertId;
    }

    // Crear cita
    const codigo_confirmacion = generateConfirmationCode();
    const [resultCita] = await connection.query(
      `INSERT INTO citas (medico_id, paciente_id, fecha, hora_inicio, hora_fin, estado, motivo_consulta, notas_paciente, codigo_confirmacion)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`,
      [medico_id, paciente_id, fecha, hora_inicio, hora_fin, motivo_consulta, notas_paciente, codigo_confirmacion]
    );

    // Obtener información del médico para el mensaje
    const [medico] = await connection.query(
      'SELECT nombre, apellido, especialidad, telefono FROM medicos WHERE id = ?',
      [medico_id]
    );

    await connection.commit();

    // Preparar datos para WhatsApp
    const citaData = {
      id: resultCita.insertId,
      codigo_confirmacion,
      paciente: {
        nombre: paciente_nombre,
        apellido: paciente_apellido,
        telefono: paciente_telefono
      },
      medico: medico[0],
      fecha,
      hora_inicio,
      hora_fin,
      motivo_consulta
    };

    // Enviar mensaje de WhatsApp automáticamente
    try {
      const mensaje = generarMensajeConfirmacionCita(citaData);
      const resultadoWhatsApp = await enviarMensajeWhatsApp(paciente_telefono, mensaje);
      
      if (resultadoWhatsApp.success) {
        console.log('📱 WhatsApp enviado:', resultadoWhatsApp.simulated ? 'SIMULADO' : `SID: ${resultadoWhatsApp.sid}`);
      } else {
        console.warn('⚠️ No se pudo enviar WhatsApp:', resultadoWhatsApp.error);
      }
    } catch (error) {
      // No fallar la creación de la cita si WhatsApp falla
      console.error('❌ Error al enviar WhatsApp (cita creada exitosamente):', error.message);
    }

    // Crear notificación para el médico
    try {
      // Formatear fecha sin conversión UTC (fecha viene como 'YYYY-MM-DD')
      const [year, month, day] = fecha.split('-');
      const fechaFormateada = `${day}/${month}/${year}`;
      
      await crearNotificacion(
        'cita_nueva',
        '🔔 Nueva Cita Agendada',
        `${paciente_nombre} ${paciente_apellido} ha agendado una cita para el ${fechaFormateada} a las ${hora_inicio}`,
        medico_id,
        'medico',
        resultCita.insertId
      );
    } catch (notifError) {
      console.error('Error al crear notificación:', notifError);
    }

    // Sincronizar con Google Calendar automáticamente
    try {
      const googleEventData = {
        fecha: fecha,
        horaInicio: hora_inicio,
        horaFin: hora_fin,
        paciente: {
          nombre: paciente_nombre,
          apellido: paciente_apellido,
          telefono: paciente_telefono,
          email: paciente_email
        },
        motivo: motivo_consulta,
        codigo: codigo_confirmacion
      };

      const googleEventId = await googleCalendarService.addEvent(googleEventData);
      
      if (googleEventId && googleEventId.eventId) {
        // Guardar el ID del evento de Google Calendar en la cita
        await connection.query(
          'UPDATE citas SET google_event_id = ? WHERE id = ?',
          [googleEventId.eventId, resultCita.insertId]
        );
        console.log('📅 Cita sincronizada con Google Calendar:', googleEventId.eventId);
      }
    } catch (calendarError) {
      // No fallar la creación de la cita si Calendar falla
      console.error('❌ Error al sincronizar con Google Calendar (cita creada exitosamente):', calendarError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Cita creada exitosamente. Pendiente de confirmación.',
      data: citaData
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear cita:', error);
    res.status(500).json({ success: false, message: 'Error al crear cita' });
  } finally {
    connection.release();
  }
};

// Actualizar estado de cita
const updateCitaEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, motivo_cancelacion, notas_medico } = req.body;

    const validEstados = ['pendiente', 'confirmada', 'cancelada', 'rechazada', 'completada', 'no_asistio'];
    if (!validEstados.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    let updateQuery = 'UPDATE citas SET estado = ?';
    const params = [estado];

    if (estado === 'confirmada') {
      updateQuery += ', confirmed_at = NOW()';
    }

    if (estado === 'cancelada' || estado === 'rechazada') {
      updateQuery += ', cancelled_at = NOW()';
      if (motivo_cancelacion) {
        updateQuery += ', motivo_cancelacion = ?';
        params.push(motivo_cancelacion);
      }
    }

    if (notas_medico) {
      updateQuery += ', notas_medico = ?';
      params.push(notas_medico);
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.query(updateQuery, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }

    // Si el estado cambió a confirmada, agregar automáticamente a Google Calendar
    if (estado === 'confirmada' && googleCalendarService.isAuthenticated()) {
      try {
        // Obtener datos completos de la cita
        const [citas] = await db.query(`
          SELECT c.*, 
                 p.nombre as paciente_nombre,
                 p.apellido as paciente_apellido,
                 p.telefono as paciente_telefono,
                 p.email as paciente_email
          FROM citas c
          JOIN pacientes p ON c.paciente_id = p.id
          WHERE c.id = ?
        `, [id]);

        if (citas.length > 0) {
          const cita = citas[0];
          const eventDetails = {
            fecha: cita.fecha instanceof Date ? cita.fecha.toISOString().split('T')[0] : cita.fecha.toString().split('T')[0],
            horaInicio: cita.hora_inicio,
            horaFin: cita.hora_fin,
            paciente: {
              nombre: cita.paciente_nombre,
              apellido: cita.paciente_apellido,
              telefono: cita.paciente_telefono,
              email: cita.paciente_email
            },
            motivo: cita.motivo_consulta,
            codigo: cita.codigo_confirmacion
          };

          // Agregar a Google Calendar
          const calendarResult = await googleCalendarService.addEvent(eventDetails);
          
          // Guardar el eventId en la base de datos
          await db.query(
            'UPDATE citas SET google_event_id = ? WHERE id = ?',
            [calendarResult.eventId, id]
          );

          console.log('✅ Cita agregada automáticamente a Google Calendar');
        }
      } catch (calendarError) {
        console.error('⚠️  Error agregando a Google Calendar (cita confirmada exitosamente):', calendarError.message);
        // No fallar la confirmación si hay error en Calendar
      }
    }

    // Si el estado cambió a cancelada/rechazada, eliminar de Google Calendar
    if ((estado === 'cancelada' || estado === 'rechazada') && googleCalendarService.isAuthenticated()) {
      try {
        const [citas] = await db.query('SELECT google_event_id FROM citas WHERE id = ?', [id]);
        if (citas.length > 0 && citas[0].google_event_id) {
          await googleCalendarService.deleteEvent(citas[0].google_event_id);
          await db.query('UPDATE citas SET google_event_id = NULL WHERE id = ?', [id]);
          console.log('✅ Evento eliminado automáticamente de Google Calendar');
        }
      } catch (calendarError) {
        console.error('⚠️  Error eliminando de Google Calendar:', calendarError.message);
      }
    }

    res.json({ success: true, message: 'Estado de cita actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar estado de cita:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estado de cita' });
  }
};

// Cancelar cita
const cancelCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_cancelacion } = req.body;

    const [result] = await db.query(
      `UPDATE citas 
       SET estado = 'cancelada', cancelled_at = NOW(), motivo_cancelacion = ?, cancelado_por = 'paciente'
       WHERE id = ? AND estado = 'pendiente'`,
      [motivo_cancelacion, id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede cancelar la cita. Verifica el estado.' 
      });
    }

    res.json({ success: true, message: 'Cita cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar cita' });
  }
};

// Obtener citas del día
const getCitasDelDia = async (req, res) => {
  try {
    const { medico_id, fecha } = req.query;
    
    const [citas] = await db.query(`
      SELECT c.*, 
             p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.telefono as paciente_telefono
      FROM citas c
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.medico_id = ? AND c.fecha = ? AND c.estado NOT IN ('cancelada', 'rechazada')
      ORDER BY c.hora_inicio ASC
    `, [medico_id, fecha]);

    res.json({ success: true, data: citas });
  } catch (error) {
    console.error('Error al obtener citas del día:', error);
    res.status(500).json({ success: false, message: 'Error al obtener citas del día' });
  }
};

module.exports = {
  getAllCitas,
  getCitaById,
  createCita,
  updateCitaEstado,
  cancelCita,
  getCitasDelDia
};
