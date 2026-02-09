const db = require('../config/database');
const emailService = require('./email.service');
const crypto = require('crypto');

/**
 * Servicio para manejar recuperación de contraseñas
 */
class PasswordResetService {
  
  /**
   * Genera un código de verificación de 6 dígitos
   */
  generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Verifica si un email puede solicitar reset (límite de intentos)
   */
  async canRequestReset(email) {
    const [usuarios] = await db.query(
      `SELECT intentos_reset, ultimo_intento_reset 
       FROM usuarios_admin 
       WHERE email = ?`,
      [email]
    );

    if (usuarios.length === 0) {
      return { can: false, reason: 'EMAIL_NOT_FOUND' };
    }

    const usuario = usuarios[0];
    const ahora = new Date();
    const ultimoIntento = usuario.ultimo_intento_reset ? new Date(usuario.ultimo_intento_reset) : null;

    // Si han pasado más de 15 minutos, resetear contador
    if (ultimoIntento && (ahora - ultimoIntento) > 15 * 60 * 1000) {
      await db.query(
        'UPDATE usuarios_admin SET intentos_reset = 0 WHERE email = ?',
        [email]
      );
      return { can: true };
    }

    // Máximo 3 intentos cada 15 minutos
    if (usuario.intentos_reset >= 3) {
      return { can: false, reason: 'TOO_MANY_ATTEMPTS' };
    }

    return { can: true };
  }

  /**
   * Solicita un código de recuperación de contraseña
   */
  async requestPasswordReset(email) {
    try {
      console.log('🔍 Iniciando requestPasswordReset para:', email);

      // Verificar si puede solicitar reset
      const canRequest = await this.canRequestReset(email);
      console.log('✅ canRequestReset resultado:', canRequest);

      if (!canRequest.can) {
        return {
          success: false,
          message: canRequest.reason === 'TOO_MANY_ATTEMPTS' 
            ? 'Demasiados intentos. Por favor espera 15 minutos.'
            : 'Email no encontrado en el sistema'
        };
      }

      // Buscar usuario por email
      console.log('🔍 Buscando usuario con email:', email);
      const [usuarios] = await db.query(
        `SELECT ua.*, CONCAT(COALESCE(ua.nombre, ''), ' ', COALESCE(ua.apellido, '')) as nombre_completo
         FROM usuarios_admin ua
         WHERE ua.email = ? AND ua.activo = TRUE`,
        [email]
      );

      console.log(`📊 Usuarios encontrados: ${usuarios.length}`);

      if (usuarios.length === 0) {
        return { success: false, message: 'Email no encontrado en el sistema' };
      }

      const usuario = usuarios[0];
      console.log('👤 Usuario encontrado:', { id: usuario.id, email: usuario.email, nombre: usuario.nombre_completo });

      // Generar código de 6 dígitos
      const code = this.generateVerificationCode();
      console.log('🔢 Código generado:', code);
      
      // Código válido por 15 minutos
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      console.log('⏰ Expira en:', expiresAt);

      // Guardar código en BD
      console.log('💾 Guardando código en BD...');
      await db.query(
        `UPDATE usuarios_admin 
         SET reset_code = ?, 
             reset_code_expires = ?, 
             ultimo_intento_reset = NOW(),
             intentos_reset = intentos_reset + 1
         WHERE id = ?`,
        [code, expiresAt, usuario.id]
      );
      console.log('✅ Código guardado en BD');

      // Enviar email con el código
      console.log('📧 Intentando enviar email...');
      const emailHtml = this.generateResetEmailHtml(usuario.nombre_completo || 'Usuario', code);
      
      await emailService.sendEmail({
        to: email,
        subject: '🔐 Código de Recuperación de Contraseña',
        html: emailHtml
      });
      console.log('✅ Email enviado exitosamente');

      return {
        success: true,
        message: 'Código de verificación enviado al correo electrónico',
        data: {
          email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Email parcial para verificación
          expiresIn: 15 // minutos
        }
      };
    } catch (error) {
      console.error('❌ Error al solicitar reset de contraseña:', error);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Verifica el código de recuperación
   */
  async verifyResetCode(email, code) {
    try {
      const [usuarios] = await db.query(
        `SELECT id, username, reset_code, reset_code_expires
         FROM usuarios_admin
         WHERE email = ? AND activo = TRUE`,
        [email]
      );

      if (usuarios.length === 0) {
        return { success: false, message: 'Email no encontrado' };
      }

      const usuario = usuarios[0];

      // Verificar si hay código
      if (!usuario.reset_code) {
        return { success: false, message: 'No hay código de verificación activo' };
      }

      // Verificar expiración
      const ahora = new Date();
      const expira = new Date(usuario.reset_code_expires);
      
      if (ahora > expira) {
        // Limpiar código expirado
        await db.query(
          'UPDATE usuarios_admin SET reset_code = NULL, reset_code_expires = NULL WHERE id = ?',
          [usuario.id]
        );
        return { success: false, message: 'El código ha expirado. Solicita uno nuevo.' };
      }

      // Verificar código
      if (usuario.reset_code !== code) {
        return { success: false, message: 'Código de verificación incorrecto' };
      }

      return {
        success: true,
        message: 'Código verificado correctamente',
        data: {
          userId: usuario.id,
          username: usuario.username
        }
      };
    } catch (error) {
      console.error('Error al verificar código:', error);
      throw error;
    }
  }

  /**
   * Cambia la contraseña usando el código de verificación
   */
  async resetPassword(email, code, newPassword) {
    try {
      // Primero verificar el código
      const verification = await this.verifyResetCode(email, code);
      
      if (!verification.success) {
        return verification;
      }

      const bcrypt = require('bcrypt');
      const password_hash = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña y limpiar código
      await db.query(
        `UPDATE usuarios_admin 
         SET password_hash = ?,
             reset_code = NULL,
             reset_code_expires = NULL,
             intentos_reset = 0,
             ultimo_intento_reset = NULL
         WHERE id = ?`,
        [password_hash, verification.data.userId]
      );

      return {
        success: true,
        message: 'Contraseña actualizada correctamente'
      };
    } catch (error) {
      console.error('Error al resetear contraseña:', error);
      throw error;
    }
  }

  /**
   * Genera HTML para el email de recuperación
   */
  generateResetEmailHtml(nombreUsuario, code) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #1a202c;
      margin-bottom: 20px;
    }
    .message {
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .code-container {
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      border-radius: 16px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
      border: 2px dashed #cbd5e0;
    }
    .code-label {
      color: #718096;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 15px;
    }
    .code {
      font-size: 48px;
      font-weight: 800;
      color: #4F46E5;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .expiry-notice {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .expiry-notice p {
      margin: 0;
      color: #78350f;
      font-size: 14px;
    }
    .footer {
      background: #f7fafc;
      padding: 30px;
      text-align: center;
      color: #718096;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .footer strong {
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Recuperación de Contraseña</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hola <strong>${nombreUsuario}</strong>,
      </div>
      
      <div class="message">
        <p>Has solicitado recuperar tu contraseña. Utiliza el siguiente código de verificación para continuar con el proceso:</p>
      </div>
      
      <div class="code-container">
        <div class="code-label">Tu Código de Verificación</div>
        <div class="code">${code}</div>
      </div>
      
      <div class="expiry-notice">
        <p><strong>⏱️ Importante:</strong> Este código es válido por <strong>15 minutos</strong>.</p>
      </div>
      
      <div class="message">
        <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña no será modificada.</p>
      </div>
    </div>
    
    <div class="footer">
      <strong>Sistema de Gestión de Citas</strong><br>
      Este es un correo automático, por favor no responder.
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

module.exports = new PasswordResetService();
