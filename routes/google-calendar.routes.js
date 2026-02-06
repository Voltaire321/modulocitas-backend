const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const googleCalendarService = require('../services/google-calendar.service');
const db = require('../config/database');

// Verificar estado de autenticación
router.get('/auth/status', async (req, res) => {
  try {
    const isAuth = googleCalendarService.isAuthenticated();
    res.json({ 
      authenticated: isAuth,
      message: isAuth ? 'Google Calendar conectado' : 'Requiere autenticación'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener URL de autenticación de Google
router.get('/auth/url', async (req, res) => {
  try {
    await googleCalendarService.initialize();
    const authUrl = googleCalendarService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Callback de OAuth (después de autorizar en Google)
router.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Código de autorización no recibido');
  }

  try {
    await googleCalendarService.getToken(code);
    
    // ✅ ACTUALIZAR LA BASE DE DATOS
    const medicoId = 1; // TODO: Obtener del state cuando sea multi-médico
    
    try {
      // Intentar obtener email del usuario
      const oauth2 = google.oauth2({
        auth: googleCalendarService.oauth2Client,
        version: 'v2'
      });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email;
      
      // Actualizar con email
      await db.query(
        `UPDATE medicos 
         SET google_calendar_connected = TRUE, 
             google_calendar_email = ? 
         WHERE id = ?`,
        [email, medicoId]
      );
      
      console.log(`✅ Google Calendar conectado para médico ${medicoId} (${email})`);
    } catch (emailError) {
      // Si falla obtener email, actualizar sin él
      console.log('⚠️ No se pudo obtener email, continuando sin él');
      await db.query(
        `UPDATE medicos 
         SET google_calendar_connected = TRUE 
         WHERE id = ?`,
        [medicoId]
      );
      
      console.log(`✅ Google Calendar conectado para médico ${medicoId}`);
    }
    
    // Redirigir al dashboard con mensaje de éxito
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Autenticación Exitosa</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
          }
          .success-icon {
            font-size: 4rem;
            color: #10b981;
            margin-bottom: 1rem;
          }
          h1 {
            color: #1f2937;
            margin-bottom: 1rem;
          }
          p {
            color: #6b7280;
            margin-bottom: 1.5rem;
          }
          button {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s;
          }
          button:hover {
            background: #5568d3;
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>¡Autenticación Exitosa!</h1>
          <p>Google Calendar ha sido conectado correctamente.</p>
          <p>Las citas confirmadas se agregarán automáticamente a tu calendario.</p>
          <button onclick="window.close()">Cerrar ventana</button>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error de Autenticación</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
          }
          .error-icon {
            font-size: 4rem;
            color: #ef4444;
            margin-bottom: 1rem;
          }
          h1 {
            color: #1f2937;
            margin-bottom: 1rem;
          }
          p {
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Error de Autenticación</h1>
          <p>${error.message}</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Agregar evento al calendario (llamado desde confirmar cita)
router.post('/events', async (req, res) => {
  try {
    const { citaId } = req.body;

    // Obtener datos de la cita
    const [citas] = await db.query(`
      SELECT c.*, 
             p.nombre as paciente_nombre,
             p.apellido as paciente_apellido,
             p.telefono as paciente_telefono,
             p.email as paciente_email
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `, [citaId]);

    if (citas.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const cita = citas[0];

    // Verificar que la cita esté confirmada
    if (cita.estado !== 'confirmada') {
      return res.status(400).json({ error: 'Solo se pueden agregar citas confirmadas' });
    }

    // Preparar datos del evento
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

    // Agregar evento a Google Calendar
    const result = await googleCalendarService.addEvent(eventDetails);

    // Guardar el eventId en la base de datos para futura referencia
    await db.query(
      'UPDATE citas SET google_event_id = ? WHERE id = ?',
      [result.eventId, citaId]
    );

    res.json({
      success: true,
      message: 'Evento agregado a Google Calendar',
      eventLink: result.eventLink
    });
  } catch (error) {
    console.error('Error agregando evento:', error);
    
    if (error.message.includes('no autenticado')) {
      return res.status(401).json({ 
        error: 'Google Calendar no autenticado',
        requiresAuth: true
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Eliminar evento del calendario
router.delete('/events/:citaId', async (req, res) => {
  try {
    const { citaId } = req.params;

    // Obtener el eventId de la base de datos
    const [citas] = await db.query('SELECT google_event_id FROM citas WHERE id = ?', [citaId]);

    if (citas.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const eventId = citas[0].google_event_id;

    if (!eventId) {
      return res.status(400).json({ error: 'Esta cita no tiene evento en Google Calendar' });
    }

    // Eliminar de Google Calendar
    await googleCalendarService.deleteEvent(eventId);

    // Limpiar el eventId de la base de datos
    await db.query('UPDATE citas SET google_event_id = NULL WHERE id = ?', [citaId]);

    res.json({
      success: true,
      message: 'Evento eliminado de Google Calendar'
    });
  } catch (error) {
    console.error('Error eliminando evento:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
