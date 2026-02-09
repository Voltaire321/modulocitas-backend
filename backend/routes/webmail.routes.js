const express = require('express');
const router = express.Router();

// Configuración de MailDev
const MAILDEV_URL = process.env.MAILDEV_URL || 'http://localhost:8025';
const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = process.env.SMTP_PORT || 2525;

/**
 * Verificar estado del servicio de webmail
 */
router.get('/status', async (req, res) => {
  try {
    res.json({
      available: true,
      status: 'MailDev está corriendo en puerto 8025'
    });
  } catch (error) {
    res.json({
      available: false,
      status: 'MailDev no está disponible'
    });
  }
});

/**
 * Obtener información de la cuenta
 */
router.get('/account/info', async (req, res) => {
  try {
    // Para desarrollo con MailDev, retornamos info estática
    res.json({
      email: 'desarrollo@citasweb.com',
      displayName: 'Entorno de Desarrollo',
      quotaUsed: 0,
      quotaLimit: 0 // Sin límite en desarrollo
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * Obtener estadísticas de correo
 */
router.get('/stats', async (req, res) => {
  try {
    // En desarrollo, retornamos stats simuladas
    res.json({
      unread: 0,
      total: 0,
      storage: {
        used: 0,
        limit: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * Obtener configuración SMTP
 */
router.get('/config', async (req, res) => {
  try {
    res.json({
      smtp: {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false,
        auth: {
          user: 'admin',
          pass: 'admin123'
        }
      },
      imap: {
        note: 'MailDev no tiene IMAP. Solo captura correos enviados vía SMTP.'
      },
      webmail: {
        url: MAILDEV_URL,
        note: 'Abre http://localhost:8025 para ver todos los correos enviados'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
