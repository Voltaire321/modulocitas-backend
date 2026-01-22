const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Ruta donde se guardará el token de acceso
const TOKEN_PATH = path.join(__dirname, '../config/google-token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../config/google-credentials.json');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
  }

  // Inicializar OAuth2 Client con las credenciales
  async initialize() {
    try {
      // Leer credenciales del archivo
      if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.log('⚠️  Archivo de credenciales no encontrado. Por favor configura google-credentials.json');
        return false;
      }

      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
      const { client_id, client_secret, redirect_uris } = credentials.web || credentials.installed;

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Verificar si ya existe un token guardado
      if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        this.oauth2Client.setCredentials(token);
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        console.log('✅ Google Calendar autenticado correctamente');
        return true;
      } else {
        console.log('⚠️  No hay token de autenticación. El médico debe autorizarse primero.');
        return false;
      }
    } catch (error) {
      console.error('❌ Error inicializando Google Calendar:', error.message);
      return false;
    }
  }

  // Generar URL de autorización para OAuth
  getAuthUrl() {
    if (!this.oauth2Client) {
      throw new Error('OAuth2Client no inicializado');
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent'
    });

    return authUrl;
  }

  // Obtener y guardar el token de acceso
  async getToken(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Guardar el token para futuros usos
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      console.log('✅ Token guardado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error obteniendo token:', error.message);
      throw error;
    }
  }

  // Verificar si está autenticado
  isAuthenticated() {
    return this.calendar !== null && fs.existsSync(TOKEN_PATH);
  }

  // Desconectar y eliminar token
  async disconnect() {
    try {
      this.calendar = null;
      this.oauth2Client = null;
      
      // Eliminar archivo de token
      if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
        console.log('✅ Token de Google Calendar eliminado');
      }
      
      return true;
    } catch (error) {
      console.error('Error desconectando Google Calendar:', error);
      throw error;
    }
  }

  // Agregar evento al calendario
  async addEvent(eventDetails) {
    if (!this.calendar) {
      throw new Error('Google Calendar no autenticado. El médico debe autorizarse primero.');
    }

    try {
      const { fecha, horaInicio, horaFin, paciente, motivo, codigo } = eventDetails;

      // Formatear fecha y hora en formato ISO
      const [year, month, day] = fecha.split('-');
      const [horaInicioH, horaInicioM] = horaInicio.substring(0, 5).split(':');
      const [horaFinH, horaFinM] = horaFin.substring(0, 5).split(':');

      // Crear objeto Date con zona horaria local
      const startDateTime = new Date(year, month - 1, day, horaInicioH, horaInicioM);
      const endDateTime = new Date(year, month - 1, day, horaFinH, horaFinM);

      const event = {
        summary: `Cita: ${paciente.nombre} ${paciente.apellido}`,
        description: `Paciente: ${paciente.nombre} ${paciente.apellido}\n` +
                    `Teléfono: ${paciente.telefono}\n` +
                    `Email: ${paciente.email}\n` +
                    `Motivo: ${motivo || 'No especificado'}\n` +
                    `Código: ${codigo}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Mexico_City'
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Mexico_City'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      console.log('✅ Evento agregado a Google Calendar:', response.data.htmlLink);
      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink
      };
    } catch (error) {
      console.error('❌ Error agregando evento:', error.message);
      throw error;
    }
  }

  // Eliminar evento del calendario
  async deleteEvent(eventId) {
    if (!this.calendar) {
      throw new Error('Google Calendar no autenticado');
    }

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      console.log('✅ Evento eliminado de Google Calendar');
      return { success: true };
    } catch (error) {
      console.error('❌ Error eliminando evento:', error.message);
      throw error;
    }
  }

  // Actualizar evento del calendario
  async updateEvent(eventId, eventDetails) {
    if (!this.calendar) {
      throw new Error('Google Calendar no autenticado');
    }

    try {
      const { fecha, horaInicio, horaFin, paciente, motivo, codigo } = eventDetails;

      const [year, month, day] = fecha.split('-');
      const [horaInicioH, horaInicioM] = horaInicio.substring(0, 5).split(':');
      const [horaFinH, horaFinM] = horaFin.substring(0, 5).split(':');

      const startDateTime = new Date(year, month - 1, day, horaInicioH, horaInicioM);
      const endDateTime = new Date(year, month - 1, day, horaFinH, horaFinM);

      const event = {
        summary: `Cita: ${paciente.nombre} ${paciente.apellido}`,
        description: `Paciente: ${paciente.nombre} ${paciente.apellido}\n` +
                    `Teléfono: ${paciente.telefono}\n` +
                    `Email: ${paciente.email}\n` +
                    `Motivo: ${motivo || 'No especificado'}\n` +
                    `Código: ${codigo}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Mexico_City'
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Mexico_City'
        }
      };

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event
      });

      console.log('✅ Evento actualizado en Google Calendar');
      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink
      };
    } catch (error) {
      console.error('❌ Error actualizando evento:', error.message);
      throw error;
    }
  }
}

// Exportar instancia única (Singleton)
const googleCalendarService = new GoogleCalendarService();
module.exports = googleCalendarService;
