/**
 * Configuración de branding para emails
 * Personaliza aquí los colores, logo y textos de tu clínica
 */

module.exports = {
  // === INFORMACIÓN DE LA EMPRESA ===
  empresa: {
    nombre: 'CitasWeb',
    slogan: 'Sistema de Gestión Médica',
    sitioWeb: 'https://citasweb.com',
    telefono: '+52 123 456 7890',
    email: 'contacto@citasweb.com',
    direccion: 'Av. Principal #123, Ciudad, Estado'
  },

  // === LOGO (Opciones) ===
  logo: {
    // Opción 1: URL de imagen (recomendado)
    url: 'https://i.imgur.com/placeholder.png', // Cambiar por tu logo
    
    // Opción 2: Logo en base64 (si quieres embeber la imagen)
    base64: null, // Se agregará cuando subas el logo
    
    // Dimensiones
    ancho: '150px',
    alto: 'auto',
    
    // Texto alternativo si no carga la imagen
    alt: 'Logo CitasWeb'
  },

  // === COLORES CORPORATIVOS ===
  colores: {
    // Color principal (header, botones, acentos)
    primario: '#3b82f6',      // Azul por defecto
    primarioOscuro: '#2563eb',
    
    // Color secundario
    secundario: '#10b981',    // Verde
    
    // Color de acento (notificaciones importantes)
    acento: '#f59e0b',        // Naranja/Amarillo
    
    // Colores de estado
    exito: '#10b981',         // Verde
    advertencia: '#f59e0b',   // Amarillo
    error: '#ef4444',         // Rojo
    info: '#3b82f6',          // Azul
    
    // Colores de texto
    textoOscuro: '#1f2937',
    textoMedio: '#4b5563',
    textoClaro: '#6b7280',
    
    // Colores de fondo
    fondoClaro: '#f9fafb',
    fondoBlanco: '#ffffff',
    fondoOscuro: '#1f2937'
  },

  // === ESTILOS DE TIPOGRAFÍA ===
  tipografia: {
    fuente: 'Arial, Helvetica, sans-serif',
    fuenteTitulo: '"Segoe UI", Arial, sans-serif',
    
    tamanos: {
      h1: '28px',
      h2: '22px',
      h3: '18px',
      normal: '16px',
      pequeno: '14px',
      muyPequeno: '12px'
    }
  },

  // === REDES SOCIALES ===
  redesSociales: {
    facebook: 'https://facebook.com/tuempresa',
    instagram: 'https://instagram.com/tuempresa',
    twitter: 'https://twitter.com/tuempresa',
    linkedin: 'https://linkedin.com/company/tuempresa'
  },

  // === TEXTOS LEGALES ===
  legal: {
    privacidad: 'https://citasweb.com/privacidad',
    terminos: 'https://citasweb.com/terminos',
    nombreCompleto: 'CitasWeb S.A. de C.V.',
    rfc: 'CTW123456789',
    copyright: `© ${new Date().getFullYear()} CitasWeb. Todos los derechos reservados.`
  },

  // === CONFIGURACIÓN DE EMAILS ===
  email: {
    remitente: {
      nombre: 'Sistema CitasWeb',
      email: 'noreply@citasweb.com'
    },
    replyTo: {
      nombre: 'Soporte CitasWeb',
      email: 'soporte@citasweb.com'
    },
    firmaAutomatica: `
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        Este es un correo automático, por favor no responder directamente.<br>
        Si necesitas asistencia, contacta a: <a href="mailto:soporte@citasweb.com">soporte@citasweb.com</a>
      </p>
    `
  }
};
