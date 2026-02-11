const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar servicio de WhatsApp
const { inicializarWhatsApp } = require('./services/whatsapp.service');
// Importar servicio de Google Calendar
const googleCalendarService = require('./services/google-calendar.service');
// Importar configuración de Passport para OAuth
const passport = require('./config/passport.config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar Passport para OAuth
app.use(passport.initialize());

// Servir archivos estáticos (avatares)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api/medicos', require('./routes/medico-perfil.routes'));
app.use('/api/medicos', require('./routes/medicos.routes'));
app.use('/api/pacientes', require('./routes/pacientes.routes'));
app.use('/api/citas', require('./routes/citas.routes'));
app.use('/api/horarios', require('./routes/horarios.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/auth', require('./routes/oauth.routes')); // Rutas OAuth (Facebook y Google)
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/disponibilidad', require('./routes/disponibilidad.routes'));
app.use('/api/recetas', require('./routes/recetas.routes'));
app.use('/api/notificaciones', require('./routes/notificaciones.routes'));
app.use('/api/google-calendar', require('./routes/google-calendar.routes'));
app.use('/api/verificacion', require('./routes/verificacion.routes'));
app.use('/api/configuracion-consultorio', require('./routes/configuracion-consultorio.routes'));
app.use('/api/webmail', require('./routes/webmail.routes'));
app.use('/api/email', require('./routes/email.routes'));
app.use('/api/branding', require('./routes/branding.routes'));
app.use('/api/restaurantes', require('./routes/restaurantes'));

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Sistema de Citas Médicas API v1.0',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend ejecutándose en puerto ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🏥 Entorno: ${process.env.NODE_ENV}`);
  
  // Inicializar WhatsApp Web de forma asíncrona (no bloquea el servidor)
  // Ahora con detección automática de modo simulado en producción
  setTimeout(() => {
    try {
      const whatsappService = require('./services/whatsapp.service');
      if (whatsappService.isSimulated()) {
        console.log('\n📱 WhatsApp en modo simulado (producción sin Chrome)');
      } else {
        console.log('\n📱 Inicializando WhatsApp Web...');
        inicializarWhatsApp();
      }
    } catch (error) {
      console.error('⚠️ Error al inicializar WhatsApp (modo simulado disponible):', error.message);
    }
  }, 1000);

  // Inicializar Google Calendar
  console.log('\n📅 Inicializando Google Calendar...');
  googleCalendarService.initialize().then(success => {
    if (success) {
      console.log('✅ Google Calendar listo para usar');
    } else {
      console.log('⚠️  Google Calendar requiere configuración inicial');
    }
  }).catch(err => {
    console.error('⚠️ Error al inicializar Google Calendar:', err.message);
  });
});

// Mantener el proceso vivo incluso con errores no manejados
process.on('uncaughtException', (error) => {
  console.error('⚠️ Error no manejado (el servidor continúa):', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Promise rechazada no manejada (el servidor continúa):', reason);
});

module.exports = app;
