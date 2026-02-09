const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const connection = require('../config/database');
const googleCalendarService = require('../services/google-calendar.service');

// Configurar multer para upload de avatares
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/avatares');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    }
  }
});

// ============================================
// Obtener perfil del médico
// ============================================
router.get('/perfil/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await connection.query(
      `SELECT 
        id, nombre, apellido, especialidad, email, telefono, 
        cedula_profesional, foto_url, whatsapp_connected, 
        google_calendar_connected, google_calendar_email, 
        configuracion_completada
      FROM medicos 
      WHERE id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Médico no encontrado' });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ success: false, message: 'Error al obtener perfil' });
  }
});

// ============================================
// Alias para /:id/perfil (compatibilidad frontend)
// ============================================
router.get('/:id/perfil', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await connection.query(
      `SELECT 
        id, nombre, apellido, especialidad, email, telefono, 
        cedula_profesional, foto_url, whatsapp_connected, 
        google_calendar_connected, google_calendar_email, 
        configuracion_completada
      FROM medicos 
      WHERE id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Médico no encontrado' });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ success: false, message: 'Error al obtener perfil' });
  }
});

// ============================================
// Actualizar perfil del médico
// ============================================
router.put('/perfil/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, especialidad, email, telefono, cedula_profesional } = req.body;
  
  try {
    await connection.query(
      `UPDATE medicos 
      SET nombre = ?, apellido = ?, especialidad = ?, 
          email = ?, telefono = ?, cedula_profesional = ?
      WHERE id = ?`,
      [nombre, apellido, especialidad, email, telefono, cedula_profesional, id]
    );
    
    res.json({ success: true, message: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar perfil' });
  }
});

// ============================================
// Marcar setup inicial como completado
// ============================================
router.put('/perfil/:id/setup-completado', async (req, res) => {
  const { id } = req.params;
  
  try {
    await connection.query(
      'UPDATE medicos SET configuracion_completada = TRUE WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, message: 'Setup marcado como completado' });
  } catch (error) {
    console.error('Error marcando setup completado:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
});

// ============================================
// Subir avatar
// ============================================
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó imagen' });
    }
    
    const { medicoId } = req.body;
    const avatarUrl = `/uploads/avatares/${req.file.filename}`;
    
    // Obtener avatar anterior para eliminarlo
    const [rows] = await connection.query(
      'SELECT foto_url FROM medicos WHERE id = ?',
      [medicoId]
    );
    
    if (rows.length > 0 && rows[0].foto_url) {
      // Eliminar avatar anterior
      const oldPath = path.join(__dirname, '../..', rows[0].foto_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    
    // Actualizar en base de datos
    await connection.query(
      'UPDATE medicos SET foto_url = ? WHERE id = ?',
      [avatarUrl, medicoId]
    );
    
    res.json({ success: true, avatarUrl });
  } catch (error) {
    console.error('Error subiendo avatar:', error);
    res.status(500).json({ success: false, message: 'Error al subir imagen' });
  }
});

// ============================================
// WhatsApp - Conectar y generar QR
// ============================================
// El lock de inicialización está en whatsapp.service.js (initializingLock)

router.get('/:id/whatsapp/connect', async (req, res) => {
  const { id } = req.params;
  
  try {
    const whatsappService = require('../services/whatsapp.service');
    
    // Si está en modo simulado, informar al frontend sin intentar nada
    if (whatsappService.isSimulated()) {
      return res.json({ 
        success: true, 
        status: 'simulated',
        message: 'WhatsApp en modo simulado (no disponible en este entorno)'
      });
    }
    
    // Verificar si ya está conectado
    if (whatsappService.isReady()) {
      await connection.query(
        'UPDATE medicos SET whatsapp_connected = TRUE WHERE id = ?',
        [id]
      );
      return res.json({ success: true, status: 'connected' });
    }
    
    // Si ya está inicializando, NO lanzar otra inicialización
    if (whatsappService.isInitializing()) {
      console.log('⏳ WhatsApp ya se está inicializando, esperando...');
      const qr = whatsappService.getLastQR();
      if (qr) {
        return res.json({ success: true, qr });
      }
      return res.json({ 
        success: true, 
        message: 'WhatsApp inicializándose, esperando QR...',
        status: 'initializing'
      });
    }
    
    // Iniciar WhatsApp (primera vez o después de que el lock se liberó)
    console.log('🔄 Iniciando WhatsApp desde /connect...');
    whatsappService.inicializarWhatsApp();
    
    return res.json({ 
      success: true, 
      message: 'Inicializando WhatsApp, el QR aparecerá en breve...',
      status: 'initializing'
    });
  } catch (error) {
    console.error('Error conectando WhatsApp:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// WhatsApp - Obtener QR actual (polling ligero)
// ============================================
router.get('/:id/whatsapp/qr', async (req, res) => {
  try {
    const whatsappService = require('../services/whatsapp.service');
    
    if (whatsappService.isSimulated()) {
      return res.json({ success: true, status: 'simulated' });
    }
    
    // Verificar conexión con fallback a getState()
    const connected = await whatsappService.checkConnection();
    if (connected) {
      const { id } = req.params;
      await connection.query(
        'UPDATE medicos SET whatsapp_connected = TRUE WHERE id = ?',
        [id]
      );
      return res.json({ success: true, status: 'connected' });
    }
    
    // Si está autenticado (QR escaneado) pero no ready aún
    if (whatsappService.isAuthenticated()) {
      return res.json({ success: true, status: 'authenticated' });
    }
    
    // Si está inicializando, solo esperar (NO retornar timeout)
    if (whatsappService.isInitializing()) {
      const qr = whatsappService.getLastQR();
      if (qr) {
        return res.json({ success: true, qr });
      }
      return res.json({ success: true, status: 'waiting' });
    }
    
    // Si NO está inicializando y NO está conectado → el init falló
    // Retornar timeout para que el frontend pueda reintentar
    const qr = whatsappService.getLastQR();
    if (qr) {
      return res.json({ success: true, qr });
    }
    return res.json({ success: true, status: 'timeout' });
  } catch (error) {
    console.error('Error obteniendo QR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// WhatsApp - Verificar estado
// ============================================
router.get('/:id/whatsapp/status', async (req, res) => {
  const { id } = req.params;
  
  try {
    const whatsappService = require('../services/whatsapp.service');
    
    // Si está en modo simulado, reportar desconectado sin error
    if (whatsappService.isSimulated()) {
      return res.json({ 
        success: true, 
        connected: false,
        simulated: true,
        message: 'WhatsApp en modo simulado'
      });
    }
    
    const isConnected = whatsappService.isReady();
    
    if (isConnected) {
      // Actualizar en base de datos
      await connection.query(
        'UPDATE medicos SET whatsapp_connected = TRUE WHERE id = ?',
        [id]
      );
    }
    
    res.json({ 
      success: true, 
      connected: isConnected 
    });
  } catch (error) {
    console.error('Error verificando estado WhatsApp:', error);
    res.status(500).json({ success: false, message: 'Error al verificar estado' });
  }
});

// ============================================
// WhatsApp - Reset completo de sesión
// ============================================
router.post('/:id/whatsapp/reset-session', async (req, res) => {
  const { id } = req.params;
  
  try {
    const whatsappService = require('../services/whatsapp.service');
    
    if (whatsappService.isSimulated()) {
      return res.json({ 
        success: true, 
        message: 'WhatsApp en modo simulado (sin sesión que resetear)'
      });
    }
    
    // Reset completo
    await whatsappService.resetSession();
    
    // Actualizar BD
    await connection.query(
      'UPDATE medicos SET whatsapp_connected = FALSE, whatsapp_session_id = NULL WHERE id = ?',
      [id]
    );
    
    res.json({ 
      success: true, 
      message: 'Sesión de WhatsApp reseteada completamente. Puedes reconectar ahora.'
    });
  } catch (error) {
    console.error('Error reseteando sesión WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al resetear sesión: ' + error.message 
    });
  }
});

// ============================================
// WhatsApp - Desconectar
// ============================================
router.post('/:id/whatsapp/disconnect', async (req, res) => {
  const { id } = req.params;
  
  try {
    const whatsappService = require('../services/whatsapp.service');
    
    // Si está en modo simulado, simplemente confirmar
    if (whatsappService.isSimulated()) {
      return res.json({ success: true, message: 'WhatsApp no estaba conectado (modo simulado)' });
    }
    
    // Desconectar y eliminar sesión
    whatsappInitializing = false;
    await whatsappService.desconectarWhatsApp();
    
    // Actualizar base de datos
    await connection.query(
      'UPDATE medicos SET whatsapp_connected = FALSE, whatsapp_session_id = NULL WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, message: 'WhatsApp desconectado' });
  } catch (error) {
    console.error('Error desconectando WhatsApp:', error);
    res.status(500).json({ success: false, message: 'Error al desconectar' });
  }
});

// ============================================
// Google Calendar - Obtener URL de autorización
// ============================================
router.get('/:id/google-calendar/auth', async (req, res) => {
  const { id } = req.params;
  
  try {
    const initialized = await googleCalendarService.initialize();
    
    // Si ya está autenticado (tiene token), informar al frontend
    if (initialized && googleCalendarService.isAuthenticated()) {
      return res.json({ 
        success: true, 
        authenticated: true, 
        message: 'Google Calendar ya está conectado' 
      });
    }
    
    // Si initialize falló (sin credenciales), oauth2Client será null
    if (!googleCalendarService.oauth2Client) {
      return res.status(400).json({ 
        success: false, 
        message: 'Google Calendar no configurado. Configure las variables de entorno GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Render.',
        requiresSetup: true
      });
    }
    
    const authUrl = googleCalendarService.getAuthUrl();
    
    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error obteniendo URL de auth:', error);
    res.status(400).json({ success: false, message: 'Google Calendar no configurado: ' + error.message, requiresSetup: true });
  }
});

// ============================================
// Google Calendar - Callback OAuth
// ============================================
router.get('/:id/google-calendar/callback', async (req, res) => {
  const { id } = req.params;
  const { code } = req.query;
  
  try {
    await googleCalendarService.getToken(code);
    
    // Actualizar estado en base de datos
    await connection.query(
      'UPDATE medicos SET google_calendar_connected = TRUE WHERE id = ?',
      [id]
    );
    
    // TODO: Guardar token en tabla medicos_google_tokens
    
    res.send('<html><body><h2>✅ Google Calendar conectado exitosamente</h2><p>Puedes cerrar esta ventana.</p><script>window.close();</script></body></html>');
  } catch (error) {
    console.error('Error en callback de Google Calendar:', error);
    res.status(500).send('Error al conectar Google Calendar');
  }
});

// ============================================
// Google Calendar - Desconectar
// ============================================
router.post('/:id/google-calendar/disconnect', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Desconectar servicio y eliminar token
    await googleCalendarService.disconnect();
    
    // Actualizar base de datos
    await connection.query(
      'UPDATE medicos SET google_calendar_connected = FALSE, google_calendar_email = NULL WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, message: 'Google Calendar desconectado' });
  } catch (error) {
    console.error('Error desconectando Google Calendar:', error);
    res.status(500).json({ success: false, message: 'Error al desconectar' });
  }
});

module.exports = router;
