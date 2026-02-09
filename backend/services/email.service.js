const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Servicio de envío de emails usando Gmail SMTP
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Inicializa el transportador de Nodemailer con configuración de Gmail
   */
  initializeTransporter() {
    try {
      // Forzar uso de Gmail SMTP en todos los ambientes para recuperación de contraseña
      console.log('🔧 Configurando Gmail SMTP...');
      console.log('📧 Usuario:', process.env.EMAIL_USER);
      console.log('🔑 Password configurado:', process.env.EMAIL_PASSWORD ? 'Sí ✅' : 'No ❌');

      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true para 465, false para otros puertos
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log('✅ Servicio de email configurado correctamente');
      console.log(`📧 Email configurado: ${process.env.EMAIL_USER}`);
      console.log('🌐 Servidor SMTP: smtp.gmail.com:587');
    } catch (error) {
      console.error('❌ Error al configurar servicio de email:', error.message);
    }
  }

  /**
   * Envía un email
   * @param {Object} options - Opciones del email
   * @param {string} options.to - Destinatario
   * @param {string} options.subject - Asunto
   * @param {string} options.text - Contenido en texto plano (opcional)
   * @param {string} options.html - Contenido en HTML (opcional)
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendEmail({ to, subject, text, html }) {
    try {
      if (!this.transporter) {
        throw new Error('Servicio de email no inicializado');
      }

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        throw new Error('Credenciales de email no configuradas en .env');
      }

      const mailOptions = {
        from: `"Sistema de Citas Médicas" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email enviado exitosamente:', {
        to,
        subject,
        messageId: info.messageId
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ Error al enviar email:', error.message);
      throw error;
    }
  }

  /**
   * Verifica la configuración del servicio de email
   * @returns {Promise<boolean>} true si la configuración es válida
   */
  async verifyConnection() {
    try {
      if (!this.transporter) {
        return false;
      }
      await this.transporter.verify();
      console.log('✅ Conexión SMTP verificada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error al verificar conexión SMTP:', error.message);
      return false;
    }
  }
}

// Exportar instancia única (Singleton)
module.exports = new EmailService();
