const db = require('../config/database');
const { enviarMensajeWhatsApp } = require('./whatsapp.service');

// Generar código de 6 dígitos
const generarCodigoVerificacion = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Enviar código de verificación por WhatsApp
const enviarCodigoVerificacion = async (telefono) => {
  try {
    // Limpiar códigos expirados de este número
    await db.query(
      'DELETE FROM codigos_verificacion WHERE telefono = ? AND (expira_en < NOW() OR verificado = TRUE)',
      [telefono]
    );

    // Verificar si ya hay un código válido reciente (menos de 2 minutos)
    const [codigosRecientes] = await db.query(
      'SELECT * FROM codigos_verificacion WHERE telefono = ? AND expira_en > NOW() AND verificado = FALSE ORDER BY created_at DESC LIMIT 1',
      [telefono]
    );

    if (codigosRecientes.length > 0) {
      const tiempoRestante = Math.ceil((new Date(codigosRecientes[0].expira_en) - new Date()) / 1000);
      if (tiempoRestante > 240) { // Si faltan más de 4 minutos (de 5 totales)
        return {
          success: false,
          message: `Ya enviamos un código. Espera ${Math.ceil(tiempoRestante / 60)} minuto(s) para solicitar otro.`,
          tiempoRestante
        };
      }
    }

    // Generar nuevo código
    const codigo = generarCodigoVerificacion();
    
    // Guardar en base de datos (expira en 5 minutos)
    const expiraEn = new Date();
    expiraEn.setMinutes(expiraEn.getMinutes() + 5);

    await db.query(
      'INSERT INTO codigos_verificacion (telefono, codigo, expira_en) VALUES (?, ?, ?)',
      [telefono, codigo, expiraEn]
    );

    // Enviar por WhatsApp
    const mensaje = `🔐 *Código de verificación - Sistema de Citas*\n\n` +
                   `Tu código es: *${codigo}*\n\n` +
                   `Este código expira en 5 minutos.\n` +
                   `No compartas este código con nadie.`;

    const whatsappResult = await enviarMensajeWhatsApp(telefono, mensaje);

    if (whatsappResult.success) {
      // Si está en modo simulado, informar al usuario
      if (whatsappResult.simulated) {
        console.log(`⚠️ Código generado (modo simulación) para ${telefono}: ${codigo}`);
        return {
          success: false,
          message: 'WhatsApp no está conectado. Escanea el código QR en la consola del servidor.'
        };
      }
      
      console.log(`✅ Código enviado a ${telefono}: ${codigo}`);
      return {
        success: true,
        message: 'Código enviado por WhatsApp',
        expiraEn: expiraEn.toISOString()
      };
    } else {
      throw new Error(whatsappResult.error || 'Error enviando WhatsApp');
    }
  } catch (error) {
    console.error('❌ Error enviando código:', error);
    throw error;
  }
};

// Verificar código ingresado por el usuario
const verificarCodigo = async (telefono, codigo) => {
  try {
    // Buscar código válido
    const [codigos] = await db.query(
      `SELECT * FROM codigos_verificacion 
       WHERE telefono = ? 
       AND codigo = ? 
       AND expira_en > NOW() 
       AND verificado = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [telefono, codigo]
    );

    if (codigos.length === 0) {
      // Verificar si el código existe pero expiró
      const [codigosExpirados] = await db.query(
        `SELECT * FROM codigos_verificacion 
         WHERE telefono = ? 
         AND codigo = ? 
         AND verificado = FALSE
         ORDER BY created_at DESC
         LIMIT 1`,
        [telefono, codigo]
      );

      if (codigosExpirados.length > 0) {
        return {
          success: false,
          message: 'El código ha expirado. Solicita uno nuevo.'
        };
      }

      return {
        success: false,
        message: 'Código incorrecto. Verifica e intenta de nuevo.'
      };
    }

    // Marcar código como verificado
    await db.query(
      'UPDATE codigos_verificacion SET verificado = TRUE WHERE id = ?',
      [codigos[0].id]
    );

    // Marcar teléfono como verificado en pacientes (si existe)
    await db.query(
      'UPDATE pacientes SET telefono_verificado = TRUE WHERE telefono = ?',
      [telefono]
    );

    console.log(`✅ Teléfono verificado: ${telefono}`);

    return {
      success: true,
      message: 'Teléfono verificado correctamente'
    };
  } catch (error) {
    console.error('❌ Error verificando código:', error);
    throw error;
  }
};

// Verificar si un teléfono ya está verificado
const esTelefonoVerificado = async (telefono) => {
  try {
    const [pacientes] = await db.query(
      'SELECT telefono_verificado FROM pacientes WHERE telefono = ? LIMIT 1',
      [telefono]
    );

    return pacientes.length > 0 && pacientes[0].telefono_verificado;
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    return false;
  }
};

module.exports = {
  enviarCodigoVerificacion,
  verificarCodigo,
  esTelefonoVerificado
};
