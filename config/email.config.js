/**
 * Configuración de email para desarrollo y producción
 * 
 * DESARROLLO: Usa MailDev (localhost:2525) - No envía correos reales
 * PRODUCCIÓN: Usa servidor SMTP real (Hostinger/Google/Microsoft)
 */

module.exports = {
  // Configuración para desarrollo local
  development: {
    host: 'localhost',
    port: 2525,
    secure: false,
    ignoreTLS: true, // Ignorar TLS para MailDev
    requireTLS: false,
    // Sin autenticación para MailDev (pero algunos contenedores lo requieren)
    auth: null,
    tls: {
      rejectUnauthorized: false
    },
    debug: true, // Muestra logs detallados
    logger: true // Registra comunicación SMTP
  },

  // Configuración para producción
  production: {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true' || true, // SSL/TLS
    auth: {
      user: process.env.SMTP_USER, // ej: citas@clinicamedica.com
      pass: process.env.SMTP_PASS  // contraseña del correo
    },
    // Opciones de seguridad
    tls: {
      rejectUnauthorized: true // Verificar certificados SSL
    },
    // Configuración de reintento
    pool: true, // Usar pool de conexiones
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // 1 segundo entre grupos de emails
    rateLimit: 10    // 10 emails por segundo máximo
  },

  // Configuración para staging (servidor de pruebas)
  staging: {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true,
    logger: true
  }
};

/**
 * Obtener configuración según el entorno
 * @returns {Object} Configuración de email
 */
function getEmailConfig() {
  const env = process.env.NODE_ENV || 'development';
  const config = module.exports[env];
  
  if (!config) {
    throw new Error(`No existe configuración de email para el entorno: ${env}`);
  }
  
  // Validar configuración de producción
  if (env === 'production' || env === 'staging') {
    if (!config.auth.user || !config.auth.pass) {
      throw new Error('SMTP_USER y SMTP_PASS son obligatorios en producción');
    }
  }
  
  return config;
}

module.exports.getEmailConfig = getEmailConfig;
