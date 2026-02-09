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

  /**
   * Lee las credenciales de Google desde archivo O desde variables de entorno.
   * En producción (Render.com), se recomienda usar las variables de entorno:
   *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
   * O bien, GOOGLE_CREDENTIALS_JSON con el JSON completo.
   */
  _getCredentials() {
    // Opción 1: Variables de entorno individuales
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const redirectUri = process.env.GOOGLE_REDIRECT_URI 
        || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/google-calendar/auth/callback`;
      console.log('📋 Usando credenciales de Google desde variables de entorno');
      return {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uris: [redirectUri]
      };
    }

    // Opción 2: Variable de entorno con JSON completo
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      try {
        const parsed = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const creds = parsed.web || parsed.installed;
        console.log('📋 Usando credenciales de Google desde GOOGLE_CREDENTIALS_JSON');
        return creds;
      } catch (e) {
        console.error('❌ Error parseando GOOGLE_CREDENTIALS_JSON:', e.message);
      }
    }

    // Opción 3: Archivo local
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
      console.log('📋 Usando credenciales de Google desde archivo local');
      return credentials.web || credentials.installed;
    }

    return null;
  }

  /**
   * Lee el token guardado desde archivo O desde variable de entorno.
   * En producción, usar GOOGLE_TOKEN_JSON con el JSON del token.
   */
  _getStoredToken() {
    // Opción 1: Variable de entorno
    if (process.env.GOOGLE_TOKEN_JSON) {
      try {
        return JSON.parse(process.env.GOOGLE_TOKEN_JSON);
      } catch (e) {
        console.error('❌ Error parseando GOOGLE_TOKEN_JSON:', e.message);
      }
    }

    // Opción 2: Archivo local
    if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    }

    return null;
  }

  // Inicializar OAuth2 Client con las credenciales
  async initialize() {
    try {
      const creds = this._getCredentials();
      
      if (!creds) {
        console.log('⚠️  Credenciales de Google no encontradas.');
        console.log('   Opciones: archivo google-credentials.json O variables GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET');
        return false;
      }

      const { client_id, client_secret, redirect_uris } = creds;

      // En producción, permitir override de redirect_uri
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || (redirect_uris && redirect_uris[0]);
      
      if (!redirectUri) {
        console.log('⚠️  No se encontró redirect_uri para Google OAuth');
        return false;
      }

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirectUri
      );

      // Verificar si ya existe un token guardado
      const token = this._getStoredToken();
      if (token) {
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
