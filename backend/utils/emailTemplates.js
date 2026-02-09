/**
 * Generador de plantillas HTML para emails
 * Usa la configuración de branding para crear emails personalizados
 */

const fs = require('fs');
const path = require('path');

/**
 * Cargar configuración de branding (personalizada o por defecto)
 */
function cargarBranding() {
  const brandingDataPath = path.join(__dirname, '../data/branding.json');
  
  try {
    // Intentar cargar configuración personalizada
    if (fs.existsSync(brandingDataPath)) {
      const data = fs.readFileSync(brandingDataPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.log('⚠️ Usando configuración de branding por defecto');
  }
  
  // Usar configuración por defecto
  return require('../config/branding.config');
}

const branding = cargarBranding();

/**
 * Genera el header del email con logo
 */
function generarHeader() {
  const { empresa, logo, colores } = branding;
  
  // Si hay logo URL, lo mostramos
  const logoHTML = logo.url && logo.url !== 'https://i.imgur.com/placeholder.png'
    ? `<img src="${logo.url}" alt="${logo.alt}" style="width: ${logo.ancho}; height: ${logo.alto}; margin-bottom: 15px;">`
    : ''; // Si no hay logo, solo texto
  
  return `
    <div style="background: linear-gradient(135deg, ${colores.primario} 0%, ${colores.primarioOscuro} 100%); 
                color: white; 
                padding: 30px; 
                text-align: center;
                border-radius: 8px 8px 0 0;">
      ${logoHTML}
      <h1 style="margin: 0; font-family: ${branding.tipografia.fuenteTitulo}; font-size: ${branding.tipografia.tamanos.h1};">
        ${empresa.nombre}
      </h1>
      <p style="margin: 10px 0 0 0; font-size: ${branding.tipografia.tamanos.pequeno}; opacity: 0.9;">
        ${empresa.slogan}
      </p>
    </div>
  `;
}

/**
 * Genera el footer del email con información de contacto
 */
function generarFooter(incluirRedesSociales = false) {
  const { empresa, legal, redesSociales, colores } = branding;
  
  const redesHTML = incluirRedesSociales ? `
    <div style="margin: 15px 0;">
      ${redesSociales.facebook ? `<a href="${redesSociales.facebook}" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Facebook</a>` : ''}
      ${redesSociales.instagram ? `<a href="${redesSociales.instagram}" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Instagram</a>` : ''}
      ${redesSociales.twitter ? `<a href="${redesSociales.twitter}" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Twitter</a>` : ''}
    </div>
  ` : '';
  
  return `
    <div style="background: ${colores.fondoOscuro}; 
                color: #9ca3af; 
                padding: 25px; 
                text-align: center; 
                font-size: ${branding.tipografia.tamanos.muyPequeno};
                border-radius: 0 0 8px 8px;">
      ${redesHTML}
      <p style="margin: 10px 0;">
        <strong>${empresa.nombre}</strong><br>
        📍 ${empresa.direccion}<br>
        📞 ${empresa.telefono}<br>
        📧 ${empresa.email}
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 11px;">
        ${legal.copyright}
      </p>
      <p style="margin: 5px 0;">
        <a href="${legal.privacidad}" style="color: #9ca3af; text-decoration: none; margin: 0 5px;">Política de Privacidad</a> | 
        <a href="${legal.terminos}" style="color: #9ca3af; text-decoration: none; margin: 0 5px;">Términos de Servicio</a>
      </p>
    </div>
  `;
}

/**
 * Plantilla base para todos los emails
 */
function plantillaBase(contenido, opciones = {}) {
  const { colores, tipografia } = branding;
  const { incluirRedesSociales = false } = opciones;
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${branding.empresa.nombre}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f3f4f6; font-family: ${tipografia.fuente};">
      <div style="max-width: 600px; margin: 0 auto; background: ${colores.fondoBlanco}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        ${generarHeader()}
        
        <div style="padding: 30px; color: ${colores.textoOscuro};">
          ${contenido}
        </div>
        
        ${generarFooter(incluirRedesSociales)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Plantilla para correo de prueba
 */
function emailPrueba(mensaje) {
  const { colores, tipografia } = branding;
  
  const contenido = `
    <h2 style="color: ${colores.textoOscuro}; margin-top: 0; font-size: ${tipografia.tamanos.h2};">
      ✅ ¡Correo de Prueba Exitoso!
    </h2>
    
    <p style="color: ${colores.textoMedio}; line-height: 1.6; font-size: ${tipografia.tamanos.normal};">
      ${mensaje || 'El sistema de correo electrónico está funcionando perfectamente.'}
    </p>
    
    <div style="background: ${colores.fondoClaro}; 
                border-left: 4px solid ${colores.info}; 
                padding: 15px; 
                margin: 20px 0;
                border-radius: 4px;">
      <p style="margin: 0; color: ${colores.textoOscuro};">
        <strong>📧 Información del servidor:</strong>
      </p>
      <p style="margin: 8px 0 0 0; color: ${colores.textoClaro}; font-size: ${tipografia.tamanos.pequeno};">
        Servidor SMTP: ${process.env.NODE_ENV === 'production' ? 'Producción' : 'MailDev (Desarrollo)'}<br>
        Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
      </p>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: ${colores.textoClaro}; font-size: ${tipografia.tamanos.pequeno}; margin: 0;">
        💡 <strong>Tip:</strong> Puedes personalizar este email editando el archivo <code>backend/config/branding.config.js</code>
      </p>
    </div>
  `;
  
  return plantillaBase(contenido, { incluirRedesSociales: true });
}

/**
 * Plantilla para notificación de cita
 */
function emailCita(datos) {
  const { paciente, doctor, fecha, hora, especialidad, consultorio } = datos;
  const { colores, tipografia, empresa } = branding;
  
  const contenido = `
    <h2 style="color: ${colores.textoOscuro}; margin-top: 0; font-size: ${tipografia.tamanos.h2};">
      📅 Confirmación de Cita Médica
    </h2>
    
    <p style="color: ${colores.textoMedio}; font-size: ${tipografia.tamanos.normal};">
      Hola <strong>${paciente.nombre}</strong>,
    </p>
    
    <p style="color: ${colores.textoMedio}; line-height: 1.6;">
      Tu cita ha sido confirmada. A continuación encontrarás todos los detalles:
    </p>
    
    <!-- Información del Doctor -->
    <div style="background: linear-gradient(135deg, ${colores.primario}15 0%, ${colores.primario}25 100%);
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: ${colores.primario}; font-size: ${tipografia.tamanos.h3};">
        👨‍⚕️ Información del Médico
      </h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${colores.textoClaro}; font-size: ${tipografia.tamanos.pequeno};">Doctor:</td>
          <td style="padding: 8px 0; color: ${colores.textoOscuro}; font-weight: bold;">${doctor.nombre}</td>
        </tr>
        ${especialidad ? `
        <tr>
          <td style="padding: 8px 0; color: ${colores.textoClaro}; font-size: ${tipografia.tamanos.pequeno};">Especialidad:</td>
          <td style="padding: 8px 0; color: ${colores.textoOscuro};">${especialidad}</td>
        </tr>
        ` : ''}
        ${consultorio ? `
        <tr>
          <td style="padding: 8px 0; color: ${colores.textoClaro}; font-size: ${tipografia.tamanos.pequeno};">Consultorio:</td>
          <td style="padding: 8px 0; color: ${colores.textoOscuro};">${consultorio}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <!-- Fecha y Hora -->
    <div style="background: linear-gradient(135deg, ${colores.exito}15 0%, ${colores.exito}25 100%);
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: ${colores.exito}; font-size: ${tipografia.tamanos.h3};">
        🗓️ Fecha y Hora
      </h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${colores.textoClaro}; font-size: ${tipografia.tamanos.pequeno};">Fecha:</td>
          <td style="padding: 8px 0; color: ${colores.textoOscuro}; font-weight: bold; font-size: 18px;">${fecha}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${colores.textoClaro}; font-size: ${tipografia.tamanos.pequeno};">Hora:</td>
          <td style="padding: 8px 0; color: ${colores.textoOscuro}; font-weight: bold; font-size: 18px;">${hora}</td>
        </tr>
      </table>
    </div>
    
    <!-- Instrucciones importantes -->
    <div style="background: ${colores.advertencia}15;
                border-left: 4px solid ${colores.advertencia};
                padding: 15px;
                margin: 25px 0;
                border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: ${colores.textoOscuro}; font-weight: bold;">
        ⚠️ Instrucciones Importantes
      </p>
      <ul style="margin: 0; padding-left: 20px; color: ${colores.textoMedio}; font-size: ${tipografia.tamanos.pequeno};">
        <li>Llega 10 minutos antes de tu cita</li>
        <li>Trae tu identificación oficial</li>
        <li>Si tienes estudios previos, llévalos contigo</li>
        <li>En caso de cancelación, avisa con 24 horas de anticipación</li>
      </ul>
    </div>
    
    <!-- Botón de acción -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${empresa.sitioWeb}/mis-citas" 
         style="display: inline-block;
                background: ${colores.primario};
                color: white;
                padding: 14px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                font-size: ${tipografia.tamanos.normal};">
        Ver Mis Citas
      </a>
    </div>
    
    <p style="color: ${colores.textoClaro}; font-size: ${tipografia.tamanos.pequeno}; text-align: center; margin-top: 25px;">
      ¿Necesitas ayuda? Contáctanos al ${empresa.telefono}
    </p>
  `;
  
  return plantillaBase(contenido, { incluirRedesSociales: false });
}

module.exports = {
  plantillaBase,
  emailPrueba,
  emailCita,
  generarHeader,
  generarFooter
};
