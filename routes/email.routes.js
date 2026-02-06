const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { getEmailConfig } = require('../config/email.config');
const { emailPrueba, emailCita } = require('../utils/emailTemplates');
const branding = require('../config/branding.config');

// Verificar que nodemailer esté correctamente importado
if (!nodemailer || typeof nodemailer.createTransport !== 'function') {
  console.error('❌ Error: nodemailer no está correctamente instalado');
  console.error('Ejecuta: npm install nodemailer');
}

// Obtener configuración según el entorno (development/production)
const emailConfig = getEmailConfig();
const transporter = nodemailer.createTransport(emailConfig);

// Verificar conexión al iniciar
transporter.verify()
  .then(() => {
    console.log('✅ Servidor de email configurado correctamente');
    console.log(`📧 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📬 Host: ${emailConfig.host}:${emailConfig.port}`);
  })
  .catch((error) => {
    console.error('❌ Error al conectar con servidor de email:', error.message);
  });

/**
 * Enviar correo de prueba
 */
router.post('/send-test', async (req, res) => {
  try {
    const { destinatario, asunto, mensaje } = req.body;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${branding.colores.primario}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f3f4f6; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">✉️ Correo de Prueba</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px;">${branding.empresa.nombre}</p>
          </div>
          <div class="content">
            <p style="white-space: pre-wrap; color: #374151;">${mensaje || 'Este es un correo de prueba del sistema de notificaciones.'}</p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;"><strong>${branding.empresa.nombre}</strong></p>
            <p style="margin: 5px 0;">${branding.empresa.telefono} | ${branding.empresa.email}</p>
            <p style="margin: 5px 0; color: #9ca3af;">${branding.empresa.direccion}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"${branding.email.remitente.nombre}" <${branding.email.remitente.email}>`,
      to: destinatario || 'doctor@ejemplo.com',
      subject: asunto || `Correo de Prueba - ${branding.empresa.nombre}`,
      html: htmlContent,
      text: mensaje || 'Correo de prueba desde ' + branding.empresa.nombre
    });

    console.log('✅ Correo enviado:', info.messageId);

    res.json({
      success: true,
      message: 'Correo enviado exitosamente',
      messageId: info.messageId,
      preview: 'Abre http://localhost:8025 para ver el correo'
    });
  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el correo',
      error: error.message
    });
  }
});

/**
 * Enviar notificación de cita
 */
router.post('/send-cita-notification', async (req, res) => {
  try {
    const { paciente, doctor, fecha, hora } = req.body;

    const info = await transporter.sendMail({
      from: `"${branding.empresa.nombre} - Notificaciones" <${branding.email.remitente.email}>`,
      to: paciente.email,
      replyTo: branding.email.replyTo.email,
      subject: '📅 Confirmación de Cita Médica',
      html: emailCita({ paciente, doctor, fecha, hora })
    });

    res.json({
      success: true,
      message: 'Notificación enviada',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Enviar correo personalizado (redactado por el usuario)
 */
router.post('/send-custom', async (req, res) => {
  try {
    console.log('📨 Recibida petición de envío personalizado');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const { destinatarios, asunto, contenido, esHTML } = req.body;

    if (!destinatarios || destinatarios.length === 0) {
      console.log('❌ Error: Sin destinatarios');
      return res.status(400).json({
        success: false,
        message: 'Debe especificar al menos un destinatario'
      });
    }

    if (!asunto || !contenido) {
      console.log('❌ Error: Falta asunto o contenido');
      return res.status(400).json({
        success: false,
        message: 'El asunto y contenido son obligatorios'
      });
    }

    console.log(`✅ Validación OK. Enviando a ${destinatarios.length} destinatario(s)`);

    // Enviar a todos los destinatarios
    const resultados = [];
    for (const dest of destinatarios) {
      try {
        // Generar HTML con formato profesional
        const htmlContent = esHTML ? contenido : `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${branding.colores.primario}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f3f4f6; border-radius: 0 0 8px 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">${branding.empresa.nombre}</h2>
                <p style="margin: 5px 0 0 0; font-size: 14px;">${branding.empresa.slogan}</p>
              </div>
              <div class="content">
                <p style="white-space: pre-wrap; color: #374151;">${contenido}</p>
              </div>
              <div class="footer">
                <p style="margin: 5px 0;"><strong>${branding.empresa.nombre}</strong></p>
                <p style="margin: 5px 0;">${branding.empresa.telefono} | ${branding.empresa.email}</p>
                <p style="margin: 5px 0; color: #9ca3af;">${branding.empresa.direccion}</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const info = await transporter.sendMail({
          from: `"${branding.email.remitente.nombre}" <${branding.email.remitente.email}>`,
          to: dest.email,
          replyTo: branding.email.replyTo.email,
          subject: asunto,
          html: htmlContent,
          text: contenido
        });

        resultados.push({
          email: dest.email,
          success: true,
          messageId: info.messageId
        });
      } catch (err) {
        resultados.push({
          email: dest.email,
          success: false,
          error: err.message
        });
      }
    }

    const exitosos = resultados.filter(r => r.success).length;
    const fallidos = resultados.filter(r => !r.success).length;

    res.json({
      success: exitosos > 0,
      message: `Enviados: ${exitosos}, Fallidos: ${fallidos}`,
      resultados,
      preview: 'Abre http://localhost:8025 para ver los correos'
    });
  } catch (error) {
    console.error('❌ Error enviando correo personalizado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar los correos',
      error: error.message
    });
  }
});

/**
 * Obtener lista de pacientes para destinatarios
 */
router.get('/recipients', async (req, res) => {
  try {
    const db = require('../config/database');
    const [pacientes] = await db.query(
      'SELECT id, nombre, apellido, email, telefono FROM pacientes WHERE email IS NOT NULL AND email != "" ORDER BY nombre, apellido'
    );

    res.json({
      success: true,
      data: pacientes.map(p => ({
        id: p.id,
        nombre: `${p.nombre} ${p.apellido || ''}`.trim(),
        email: p.email,
        telefono: p.telefono
      }))
    });
  } catch (error) {
    console.error('Error obteniendo destinatarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener destinatarios',
      error: error.message
    });
  }
});

module.exports = router;
