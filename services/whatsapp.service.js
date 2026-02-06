const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

// Cliente de WhatsApp
let whatsappClient = null;
let clientReady = false;
let lastQR = null; // Almacenar último QR generado

/**
 * Inicializa el cliente de WhatsApp Web
 */
const inicializarWhatsApp = () => {
  if (whatsappClient && clientReady) {
    console.log('⚠️ Cliente de WhatsApp ya conectado');
    return whatsappClient;
  }

  console.log('🔄 Inicializando WhatsApp Web...');
  
  // Limpiar QR anterior
  lastQR = null;

  try {
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        dataPath: './whatsapp-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    // Evento: Mostrar QR para escanear
    whatsappClient.on('qr', async (qr) => {
      console.log('\n' + '='.repeat(60));
      console.log('🔐 ESCANEA ESTE QR CON TU WHATSAPP:');
      console.log('='.repeat(60) + '\n');
      qrcode.generate(qr, { small: true });
      console.log('\n' + '='.repeat(60));
      console.log('👆 Abre WhatsApp > Dispositivos vinculados > Vincular dispositivo');
      console.log('='.repeat(60) + '\n');
      
      // Generar QR en base64 para enviar al frontend
      try {
        lastQR = await QRCode.toDataURL(qr);
        console.log('✅ QR generado en base64 para el frontend');
      } catch (err) {
        console.error('Error generando QR base64:', err);
      }
    });

    // Evento: Cliente listo
    whatsappClient.on('ready', () => {
      clientReady = true;
      lastQR = null; // Limpiar QR una vez conectado
      console.log('✅ WhatsApp Web conectado y listo para enviar mensajes\n');
    });

    // Evento: Autenticación exitosa
    whatsappClient.on('authenticated', () => {
      console.log('✅ WhatsApp autenticado correctamente');
    });

    // Evento: Fallo de autenticación
    whatsappClient.on('auth_failure', (msg) => {
      console.error('❌ Error de autenticación WhatsApp:', msg);
      clientReady = false;
    });

    // Evento: Desconectado
    whatsappClient.on('disconnected', (reason) => {
      console.log('⚠️ WhatsApp desconectado:', reason);
      clientReady = false;
    });

    // Evento: Error sin manejo
    whatsappClient.on('error', (error) => {
      console.error('⚠️ Error de WhatsApp (no crítico):', error.message);
      // No detener el proceso - continuar en modo simulado
    });

    // Inicializar cliente
    whatsappClient.initialize().catch(err => {
      console.error('⚠️ Error al inicializar WhatsApp:', err.message);
      console.log('📱 WhatsApp funcionará en modo simulado');
    });

    return whatsappClient;
  } catch (error) {
    console.error('⚠️ Error crítico al crear cliente WhatsApp:', error.message);
    console.log('📱 WhatsApp funcionará en modo simulado');
    return null;
  }
};

/**
 * Envía un mensaje de WhatsApp usando WhatsApp Web
 * @param {string} phoneNumber - Número de teléfono del destinatario (10 dígitos)
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<Object>} - Resultado del envío
 */
const enviarMensajeWhatsApp = async (phoneNumber, message) => {
  try {
    // Verificar si el cliente está listo
    if (!clientReady || !whatsappClient) {
      console.log('⚠️ WhatsApp no está conectado - Modo simulación');
      console.log('📱 Número:', phoneNumber);
      console.log('💬 Mensaje:', message);
      return {
        success: true,
        simulated: true,
        message: 'Mensaje simulado (WhatsApp no conectado). Escanea el QR en la consola del servidor.'
      };
    }

    // Verificar estado del cliente
    const state = await whatsappClient.getState().catch(() => 'UNKNOWN');
    console.log('📊 Estado de WhatsApp:', state);
    
    if (state !== 'CONNECTED') {
      console.warn('⚠️ WhatsApp no está en estado CONNECTED, estado actual:', state);
      return {
        success: false,
        error: 'WhatsApp no está conectado correctamente. Estado: ' + state
      };
    }

    // Formatear número de teléfono
    let formattedNumber = phoneNumber.replace(/\D/g, ''); // Quitar caracteres no numéricos
    
    // Si no tiene código de país, agregar 52 (México)
    if (!formattedNumber.startsWith('52')) {
      formattedNumber = '52' + formattedNumber;
    }
    
    console.log('📱 Intentando enviar WhatsApp a:', formattedNumber);

    try {
      const numberId = await whatsappClient.getNumberId(formattedNumber);
      
      if (!numberId) {
        console.warn('⚠️ El número no está registrado en WhatsApp:', formattedNumber);
        return {
          success: false,
          error: 'Número no registrado en WhatsApp'
        };
      }

      console.log('✅ Número verificado:', numberId._serialized);

      // Enviar mensaje con opciones para evitar errores de markedUnread
      console.log('📤 Enviando mensaje a WhatsApp...');
      console.log('📝 Contenido del mensaje:', message.substring(0, 100) + '...');
      
      try {
        // Enviar mensaje con opciones que deshabilitan sendSeen automático
        const messageResult = await whatsappClient.sendMessage(numberId._serialized, message, {
          sendSeen: false,  // No marcar como leído automáticamente
          sendMediaAsSticker: false,
          sendMediaAsDocument: false,
          parseVCards: true,
          caption: ''
        });
        
        console.log('✅ sendMessage ejecutado sin error');
        
        if (messageResult) {
          console.log('✅ WhatsApp enviado exitosamente');
          console.log('📋 Detalles del mensaje:', {
            id: messageResult.id ? messageResult.id._serialized : 'no-id',
            ack: messageResult.ack,
            hasMedia: messageResult.hasMedia,
            type: messageResult.type,
            timestamp: messageResult.timestamp
          });
          
          return {
            success: true,
            simulated: false,
            to: formattedNumber,
            sid: messageResult.id ? messageResult.id._serialized : 'sent'
          };
        } else {
          console.warn('⚠️ sendMessage retornó null/undefined');
          return {
            success: false,
            error: 'WhatsApp no retornó confirmación de envío'
          };
        }
      } catch (error) {
        console.error('❌ Error capturado en sendMessage:', error.message);
        console.error('📋 Stack completo:', error.stack);
        
        // Cualquier error aquí significa que el mensaje NO se envió
        return {
          success: false,
          error: 'Error al enviar WhatsApp: ' + error.message,
          details: error.stack
        };
      }

    } catch (verificationError) {
      console.error('❌ Error al enviar WhatsApp:', verificationError.message);
      return {
        success: false,
        error: verificationError.message
      };
    }

  } catch (error) {
    console.error('❌ Error general al enviar WhatsApp:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Genera el mensaje de confirmación de cita
 * @param {Object} citaData - Datos de la cita
 * @returns {string} - Mensaje formateado
 */
const generarMensajeConfirmacionCita = (citaData) => {
  const { paciente, medico, fecha, hora_inicio, hora_fin, motivo_consulta, codigo_confirmacion } = citaData;
  
  // Formatear fecha sin conversión UTC
  const [year, month, day] = fecha.split('-');
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  
  // Crear fecha local sin conversión UTC
  const fechaLocal = new Date(year, parseInt(month) - 1, parseInt(day));
  const diaSemana = diasSemana[fechaLocal.getDay()];
  const fechaCompleta = `${diaSemana}, ${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`;
  
  const mensaje = `🏥 *CONFIRMACIÓN DE CITA MÉDICA*

Hola ${paciente.nombre} ${paciente.apellido},

Tu cita ha sido agendada exitosamente:

👨‍⚕️ *Doctor:* ${medico.nombre} ${medico.apellido}
🔬 *Especialidad:* ${medico.especialidad}
📅 *Fecha:* ${fechaCompleta}
🕐 *Horario:* ${hora_inicio} - ${hora_fin}
📝 *Motivo:* ${motivo_consulta}
🔑 *Código de confirmación:* ${codigo_confirmacion}

⚠️ *Estado:* Pendiente de confirmación

Por favor, presenta tu código de confirmación el día de tu cita.

_Este mensaje fue generado automáticamente._`;

  return mensaje;
};

/**
 * Envía un documento (PDF) por WhatsApp
 * @param {string} phoneNumber - Número de teléfono
 * @param {Buffer} pdfBuffer - Buffer del PDF
 * @param {string} filename - Nombre del archivo
 * @param {string} caption - Mensaje/caption opcional
 * @returns {Promise<Object>}
 */
const enviarDocumentoWhatsApp = async (phoneNumber, pdfBuffer, filename, caption = '') => {
  try {
    if (!clientReady || !whatsappClient) {
      console.warn('⚠️ WhatsApp no está listo, no se puede enviar documento');
      return {
        success: false,
        error: 'WhatsApp no está inicializado'
      };
    }

    // Formatear número
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (!formattedNumber.startsWith('52')) {
      formattedNumber = '52' + formattedNumber;
    }
    
    console.log('📱 Intentando enviar documento WhatsApp a:', formattedNumber);

    try {
      const numberId = await whatsappClient.getNumberId(formattedNumber);
      
      if (!numberId) {
        console.warn('⚠️ El número no está registrado en WhatsApp:', formattedNumber);
        return {
          success: false,
          error: 'Número no registrado en WhatsApp'
        };
      }

      console.log('✅ Número verificado:', numberId._serialized);

      // Intentar enviar el PDF con manejo robusto de errores
      try {
        console.log('📄 Preparando envío de documento PDF...');
        
        // SOLUCIÓN AL BUG markedUnread: Enviar primero el texto
        if (caption) {
          await whatsappClient.sendMessage(numberId._serialized, caption);
          console.log('✅ Mensaje de texto enviado');
          // Pequeña pausa entre mensajes
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Crear MessageMedia desde el buffer (sin opciones adicionales)
        const media = new MessageMedia(
          'application/pdf', 
          pdfBuffer.toString('base64'), 
          filename
        );

        // Enviar SOLO el documento, sin ninguna opción
        await whatsappClient.sendMessage(numberId._serialized, media);
        
        console.log('✅ Documento PDF enviado exitosamente');

        return {
          success: true,
          simulated: false,
          to: formattedNumber
        };

      } catch (sendError) {
        console.error('❌ Error al enviar PDF:', sendError.message);
        console.error('Stack completo:', sendError.stack);
        console.log('⚠️ Intentando enviar solo el mensaje de texto...');
        
        // Fallback: Si falla el PDF, enviar solo el mensaje de texto
        try {
          const mensajeFallback = `📋 *RECETA MÉDICA*\n\n` +
            `⚠️ No se pudo enviar el PDF adjunto.\n\n` +
            `${caption}\n\n` +
            `_Por favor solicita el archivo PDF directamente al consultorio._`;
          
          await whatsappClient.sendMessage(numberId._serialized, mensajeFallback);
          console.log('✅ Mensaje de texto enviado como alternativa');
          
          return {
            success: true,
            simulated: false,
            to: formattedNumber,
            warning: 'PDF no enviado, solo mensaje de texto'
          };
        } catch (fallbackError) {
          console.error('❌ También falló el envío del mensaje de texto:', fallbackError.message);
          throw sendError; // Lanzar el error original
        }
      }

    } catch (verificationError) {
      console.error('❌ Error al enviar documento WhatsApp:', verificationError.message);
      return {
        success: false,
        error: verificationError.message
      };
    }

  } catch (error) {
    console.error('❌ Error crítico al enviar documento WhatsApp:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Obtiene el último QR generado
 */
const getLastQR = () => {
  return lastQR;
};

/**
 * Obtiene el estado actual del cliente
 */
const getState = async () => {
  if (!whatsappClient) {
    return 'NOT_INITIALIZED';
  }
  
  if (clientReady) {
    return 'CONNECTED';
  }
  
  try {
    const state = await whatsappClient.getState();
    return state;
  } catch (error) {
    return 'DISCONNECTED';
  }
};

/**
 * Verifica si el cliente está listo
 */
const isReady = () => {
  return clientReady;
};

/**
 * Desconecta WhatsApp y elimina la sesión
 */
const desconectarWhatsApp = async () => {
  try {
    if (whatsappClient) {
      await whatsappClient.logout();
      await whatsappClient.destroy();
      whatsappClient = null;
      clientReady = false;
      lastQR = null;
      
      // Eliminar carpeta de sesión
      const sessionPath = path.join(__dirname, '../whatsapp-session');
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('✅ Sesión de WhatsApp eliminada');
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error desconectando WhatsApp:', error);
    throw error;
  }
};

module.exports = {
  inicializarWhatsApp,
  enviarMensajeWhatsApp,
  enviarDocumentoWhatsApp,
  generarMensajeConfirmacionCita,
  getLastQR,
  getState,
  isReady,
  desconectarWhatsApp
};
