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
        cedula_profesional, avatar_url, whatsapp_connected, 
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
      'SELECT avatar_url FROM medicos WHERE id = ?',
      [medicoId]
    );
    
    if (rows.length > 0 && rows[0].avatar_url) {
      // Eliminar avatar anterior
      const oldPath = path.join(__dirname, '../..', rows[0].avatar_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    
    // Actualizar en base de datos
    await connection.query(
      'UPDATE medicos SET avatar_url = ? WHERE id = ?',
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
router.get('/:id/whatsapp/connect', async (req, res) => {
  const { id } = req.params;
  
  try {
    const whatsappService = require('../services/whatsapp.service');
    
    // Verificar si ya está conectado
    const state = await whatsappService.getState();
    
    if (state === 'CONNECTED') {
      // Ya está conectado
      await connection.query(
        'UPDATE medicos SET whatsapp_connected = TRUE WHERE id = ?',
        [id]
      );
      return res.json({ success: true, status: 'connected' });
    }
    
    // Si no está conectado, asegurar que se inicialice
    if (state === 'NOT_INITIALIZED' || state === 'DISCONNECTED') {
      whatsappService.inicializarWhatsApp();
      // Esperar un momento para que se genere el QR
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Obtener el último QR generado
    const qr = whatsappService.getLastQR();
    
    if (qr) {
      return res.json({ success: true, qr });
    } else {
      // Si no hay QR, el cliente está inicializándose
      return res.json({ 
        success: true, 
        message: 'Inicializando WhatsApp, el QR aparecerá en breve...',
        status: 'initializing'
      });
    }
  } catch (error) {
    console.error('Error conectando WhatsApp:', error);
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
// WhatsApp - Desconectar
// ============================================
router.post('/:id/whatsapp/disconnect', async (req, res) => {
  const { id } = req.params;
  
  try {
    const whatsappService = require('../services/whatsapp.service');
    
    // Desconectar y eliminar sesión
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
    await googleCalendarService.initialize();
    const authUrl = googleCalendarService.getAuthUrl();
    
    // Guardar estado para callback
    // TODO: Implementar estado por médico
    
    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error obteniendo URL de auth:', error);
    res.status(500).json({ success: false, message: 'Error al generar URL' });
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
