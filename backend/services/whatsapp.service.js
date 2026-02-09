const fs = require('fs');
const path = require('path');

// ============================================
// MODO SIMULADO: Se activa automáticamente en producción
// EXCEPTO si WHATSAPP_FORCE_REAL=true (ej: Docker con Chrome)
// Controlar con: WHATSAPP_SIMULATED=true para forzar simulado
//                WHATSAPP_FORCE_REAL=true para forzar real (Docker)
// ============================================
const IS_SIMULATED = process.env.WHATSAPP_SIMULATED === 'true' 
  || (process.env.WHATSAPP_FORCE_REAL !== 'true' && (!!process.env.RENDER || process.env.NODE_ENV === 'production'));

// Solo importar dependencias pesadas si NO estamos en modo simulado
let qrcode, QRCode, Client, LocalAuth, MessageMedia;
if (!IS_SIMULATED) {
  try {
    qrcode = require('qrcode-terminal');
    QRCode = require('qrcode');
    const wwjs = require('whatsapp-web.js');
    Client = wwjs.Client;
    LocalAuth = wwjs.LocalAuth;
    MessageMedia = wwjs.MessageMedia;
  } catch (err) {
    console.warn('⚠️ whatsapp-web.js no disponible, forzando modo simulado:', err.message);
  }
}

if (IS_SIMULATED) {
  console.log('📱 WhatsApp iniciado en MODO SIMULADO (sin Chrome/Puppeteer)');
  console.log('   Para activar WhatsApp real: WHATSAPP_SIMULATED=false + WHATSAPP_FORCE_REAL=true');
}

// Cliente de WhatsApp
let whatsappClient = null;
let clientReady = false;
let clientAuthenticated = false;
let lastQR = null; // Almacenar último QR generado
let initializingLock = false; // Lock real de inicialización
let initStartTime = null; // Timestamp de inicio de init

/**
 * Inicializa el cliente de WhatsApp Web
 * En modo simulado no intenta conectar Puppeteer/Chrome
 */
const inicializarWhatsApp = async () => {
  // === MODO SIMULADO: No intentar nada con Puppeteer ===
  if (IS_SIMULATED || !Client) {
    console.log('📱 WhatsApp en modo simulado — no se requiere Chrome');
    clientReady = false;
    whatsappClient = null;
    return null;
  }

  if (whatsappClient && clientReady) {
    console.log('⚠️ Cliente de WhatsApp ya conectado');
    return whatsappClient;
  }

  // LOCK: Prevenir inicializaciones concurrentes
  if (initializingLock) {
    const elapsed = Date.now() - (initStartTime || 0);
    if (elapsed < 90000) { // 90 seg de protección
      console.log(`⏳ Inicialización ya en curso (${Math.round(elapsed/1000)}s), ignorando solicitud duplicada`);
      return null;
    }
    // Si pasaron >90s, el init anterior probablemente murió
    console.log('⏰ Timeout de lock de inicialización (>90s), permitiendo re-init');
  }

  initializingLock = true;
  initStartTime = Date.now();

  // Si hay un cliente anterior muerto/fallido, limpiarlo
  if (whatsappClient && !clientReady) {
    console.log('🧹 Limpiando cliente WhatsApp anterior...');
    try {
      if (whatsappClient.pupBrowser) {
        await whatsappClient.pupBrowser.close().catch(() => {});
      }
      await whatsappClient.destroy().catch(() => {});
    } catch (e) {
      console.log('⚠️ Error destruyendo cliente anterior:', e.message);
    }
    whatsappClient = null;
    clientAuthenticated = false;
    lastQR = null;
    // Esperar un poco para que Chromium libere el lock del directorio
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('🔄 Inicializando WhatsApp Web...');
  
  // Limpiar QR anterior
  lastQR = null;

  try {
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        dataPath: './whatsapp-session'
      }),
      authTimeoutMs: 0,
      qrMaxRetries: 10,
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        timeout: 120000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-software-rasterizer',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--mute-audio',
          '--disable-hang-monitor',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--renderer-process-limit=1',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees,AudioServiceOutOfProcess,IsolateOrigins,site-per-process',
          // Flags adicionales para reducir RAM en 512MB environment
          '--single-process',  // TODO: Ejecutar en single process (arriesgado pero necesario)
          '--no-zygote',
          '--disable-cache',
          '--disk-cache-size=1',
          '--media-cache-size=1',
          '--memory-pressure-off'
          // NO limitar --max-old-space-size: WhatsApp Web necesita >128MB de JS heap para inicializar Store
        ]
      }
    });

    // Evento: Mostrar QR para escanear
    whatsappClient.on('qr', async (qr) => {
      // Si recibimos un QR pero clientReady era true, fue un falso positivo
      if (clientReady) {
        console.log('⚠️ QR recibido pero clientReady era true — reseteando (falso positivo)');
        clientReady = false;
        clientAuthenticated = false;
      }
      
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
      clientAuthenticated = true;
      initializingLock = false; // Liberar lock
      lastQR = null; // Limpiar QR una vez conectado
      console.log('✅ WhatsApp Web conectado y listo para enviar mensajes\n');
    });

    // Evento: Autenticación exitosa (QR escaneado OK)
    whatsappClient.on('authenticated', () => {
      clientAuthenticated = true;
      lastQR = null; // QR ya no se necesita
      console.log('✅ WhatsApp autenticado correctamente (esperando ready...)');
      // Fallback: verificar estado manualmente cada 5 seg, hasta 6 intentos (30s)
      let fallbackAttempts = 0;
      const fallbackCheck = setInterval(async () => {
        fallbackAttempts++;
        if (clientReady || fallbackAttempts > 6) {
          clearInterval(fallbackCheck);
          if (!clientReady) console.log('⚠️ Fallback: no se pudo confirmar conexión después de 30s');
          return;
        }
        if (whatsappClient) {
          try {
            const state = await whatsappClient.getState();
            console.log(`🔍 Fallback intento ${fallbackAttempts}: estado = ${state}`);
            if (state === 'CONNECTED') {
              clientReady = true;
              clearInterval(fallbackCheck);
              console.log('✅ WhatsApp conectado (detectado por fallback getState)');
            }
          } catch (e) {
            console.log(`⚠️ Fallback intento ${fallbackAttempts} falló:`, e.message);
          }
        }
      }, 5000);
    });

    // Evento: Pantalla de carga (indica progreso)
    whatsappClient.on('loading_screen', (percent, message) => {
      console.log(`📱 WhatsApp cargando: ${percent}% - ${message}`);
    });

    // Evento: Cambio de estado
    whatsappClient.on('change_state', (state) => {
      console.log('🔄 WhatsApp cambió de estado:', state);
      if (state === 'CONNECTED') {
        clientReady = true;
        clientAuthenticated = true;
        console.log('✅ WhatsApp conectado (detectado por change_state)');
      }
    });

    // Evento: Fallo de autenticación
    whatsappClient.on('auth_failure', (msg) => {
      console.error('❌ Error de autenticación WhatsApp:', msg);
      clientReady = false;
      clientAuthenticated = false;
      initializingLock = false;
      lastQR = null;
    });

    // Evento: Desconectado
    whatsappClient.on('disconnected', (reason) => {
      console.log('⚠️ WhatsApp desconectado:', reason);
      clientReady = false;
      clientAuthenticated = false;
      initializingLock = false;
      lastQR = null;
      // Destruir cliente para permitir re-inicialización
      if (whatsappClient) {
        whatsappClient.destroy().catch(() => {});
        whatsappClient = null;
      }
    });

    // Evento: Error sin manejo
    whatsappClient.on('error', (error) => {
      console.error('⚠️ Error de WhatsApp:', error.message);
      if (error.message.includes('Session closed') || error.message.includes('Protocol error')) {
        console.error('💥 Chromium probablemente se quedó sin memoria (OOM)');
        console.error('   RAM disponible insuficiente para mantener la sesión');
      }
      // No detener el proceso
    });

    // Inicializar cliente con log de memoria
    console.log('📊 Memoria antes de initialize:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB heap');
    
    // POLLING DE SEGURIDAD: detectar conexión via evaluación directa de la página
    // getState() depende de window.Store que puede tardar en cargar
    // Usamos evaluación directa del DOM como fallback
    const safetyPoll = setInterval(async () => {
      if (clientReady) {
        clearInterval(safetyPoll);
        return;
      }
      if (!whatsappClient) {
        clearInterval(safetyPoll);
        return;
      }
      try {
        // Método 1: getState() clásico (depende de Store)
        const state = await whatsappClient.getState();
        if (state === 'CONNECTED') {
          clientReady = true;
          clientAuthenticated = true;
          initializingLock = false;
          lastQR = null;
          clearInterval(safetyPoll);
          console.log('✅ WhatsApp conectado (safety poll via getState)');
          return;
        }
        
        // Método 2: Evaluación directa del DOM de la página
        // Si Store no carga, revisamos si el chat list ya apareció
        // SOLO aceptar conexión con EVIDENCIA REAL: chats visibles
        if (whatsappClient && whatsappClient.pupPage) {
          const pageCheck = await whatsappClient.pupPage.evaluate(() => {
            const storeExists = !!(window.Store && window.Store.AppState);
            const storeState = storeExists ? window.Store.AppState.state : null;
            // Selectores ESTRICTOS: solo existen cuando hay sesión activa
            const hasSidePanel = !!document.querySelector('#side, [data-testid="chatlist-header"], [data-testid="chat-list"]');
            const hasTwoPanel = !!document.querySelector('#app .two, .two._aigs');
            // Verificar que NO estamos en pantalla de QR/landing
            const isLandingPage = !!document.querySelector('.landing-wrapper, .landing-main, [data-testid="intro-md-beta-logo"], [data-ref]');
            const hasQRCanvas = !!document.querySelector('canvas');
            return { storeExists, storeState, hasSidePanel, hasTwoPanel, isLandingPage, hasQRCanvas };
          }).catch(() => null);
          
          if (pageCheck) {
            console.log('🔄 Safety poll:', JSON.stringify(pageCheck));
            // ÚNICA condición aceptada: DEBE tener panel lateral o layout 2 columnas (chats visibles)
            // SIN estados intermedios — si no hay chats, no está conectado
            if ((pageCheck.hasSidePanel || pageCheck.hasTwoPanel) && !pageCheck.isLandingPage && !pageCheck.hasQRCanvas) {
              clientReady = true;
              clientAuthenticated = true;
              initializingLock = false;
              lastQR = null;
              clearInterval(safetyPoll);
              console.log('✅ WhatsApp conectado (safety poll via DOM - chats visibles)');
              return;
            }
          }
        }
      } catch (e) {
        // Puede fallar antes de que Puppeteer esté listo
        console.log('⚠️ Safety poll error:', e.message?.substring(0, 80));
      }
    }, 5000);
    // Limpiar el polling después de 3 minutos
    setTimeout(() => {
      clearInterval(safetyPoll);
      if (!clientReady) {
        console.log('⏰ Safety poll timeout (3 min), WhatsApp no se conectó');
      }
    }, 180000);
    
    whatsappClient.initialize().catch(err => {
      console.error('⚠️ Error al inicializar WhatsApp:', err.message);
      console.error('📊 Memoria al fallar:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB heap');
      console.log('📱 WhatsApp funcionará en modo simulado');
      // Limpiar todo para permitir re-inicialización
      if (whatsappClient) {
        try {
          if (whatsappClient.pupBrowser) whatsappClient.pupBrowser.close().catch(() => {});
        } catch(e) {}
        whatsappClient.destroy().catch(() => {});
      }
      whatsappClient = null;
      clientReady = false;
      clientAuthenticated = false;
      initializingLock = false;
      lastQR = null;
    });

    return whatsappClient;
  } catch (error) {
    console.error('⚠️ Error crítico al crear cliente WhatsApp:', error.message);
    console.log('📱 WhatsApp funcionará en modo simulado');
    whatsappClient = null;
    clientReady = false;
    clientAuthenticated = false;
    initializingLock = false;
    lastQR = null;
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
    const state = await whatsappClient.getState().catch(() => null);
    console.log('📊 Estado de WhatsApp:', state);
    
    if (state !== 'CONNECTED') {
      // Si getState() retorna null pero clientReady es true, 
      // Store no cargó aún pero la sesión puede estar activa.
      // Intentar verificación DOM antes de rechazar.
      if (state === null && clientReady && whatsappClient.pupPage) {
        try {
          const domOk = await whatsappClient.pupPage.evaluate(() => {
            const hasChat = !!document.querySelector('#side, [data-testid="chatlist-header"], [data-testid="chat-list"]');
            const hasTwoPanel = !!document.querySelector('#app .two, .two._aigs');
            const noQR = !document.querySelector('canvas');
            const noLanding = !document.querySelector('.landing-wrapper, .landing-main');
            return { hasChat, hasTwoPanel, noQR, noLanding };
          });
          
          // SOLO aceptar si hay chats visibles - SIN estados intermedios
          const hasChats = domOk.hasChat || domOk.hasTwoPanel;
          
          if (hasChats && domOk.noQR && domOk.noLanding) {
            console.log('📊 getState()=null pero DOM confirma conexión (chats visibles), procediendo con envío...');
            // Continuar con el envío
          } else {
            console.warn('⚠️ getState()=null y DOM no muestra chats visibles - rechazando');
            clientReady = false; // Resetear falso positivo
            return {
              success: false,
              error: 'WhatsApp no está conectado correctamente. Reconecta desde el perfil.'
            };
          }
        } catch (e) {
          console.warn('⚠️ Error verificando DOM:', e.message);
          return {
            success: false,
            error: 'WhatsApp no está conectado correctamente. Estado: ' + state
          };
        }
      } else {
        console.warn('⚠️ WhatsApp no está en estado CONNECTED, estado actual:', state);
        return {
          success: false,
          error: 'WhatsApp no está conectado correctamente. Estado: ' + state
        };
      }
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
    if (IS_SIMULATED || !clientReady || !whatsappClient) {
      console.log('⚠️ WhatsApp no disponible — documento no enviado (modo simulado)');
      console.log('📄 Documento:', filename, '→', phoneNumber);
      return {
        success: true,
        simulated: true,
        message: 'Documento simulado (WhatsApp no conectado)'
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
 * Verifica si el cliente fue autenticado (QR escaneado)
 */
const isAuthenticated = () => {
  return clientAuthenticated;
};

/**
 * Verifica conexión con múltiples métodos:
 * 1. clientReady (ya detectado)
 * 2. getState() (depende de Store)
 * 3. Evaluación directa del DOM de Chromium
 */
const checkConnection = async () => {
  if (clientReady) return true;
  if (!whatsappClient) return false;
  
  try {
    // Método 1: getState()
    const state = await whatsappClient.getState();
    if (state === 'CONNECTED') {
      clientReady = true;
      clientAuthenticated = true;
      initializingLock = false;
      lastQR = null;
      console.log('✅ WhatsApp conectado (checkConnection via getState)');
      return true;
    }
    
    // Método 2: DOM check (si Store no cargó)
    // SOLO aceptar conexión con EVIDENCIA REAL: chats visibles
    if (state === null && whatsappClient.pupPage) {
      const domCheck = await whatsappClient.pupPage.evaluate(() => {
        // Solo selectores que EXCLUSIVAMENTE aparecen post-autenticación
        const hasChat = !!document.querySelector('#side, [data-testid="chatlist-header"], [data-testid="chat-list"]');
        const hasTwoPanel = !!document.querySelector('#app .two, .two._aigs');
        const noQR = !document.querySelector('canvas');
        const noLanding = !document.querySelector('.landing-wrapper, .landing-main, [data-ref]');
        return { hasChat, hasTwoPanel, noQR, noLanding };
      }).catch(() => null);
      
      if (domCheck) {
        // ÚNICA condición: Tiene chats visibles (sin QR ni landing)
        // SIN estados intermedios
        if ((domCheck.hasChat || domCheck.hasTwoPanel) && domCheck.noQR && domCheck.noLanding) {
          clientReady = true;
          clientAuthenticated = true;
          initializingLock = false;
          lastQR = null;
          console.log('✅ WhatsApp conectado (checkConnection via DOM - chats visibles)');
          return true;
        }
      }
    }
  } catch (e) {
    // Puede fallar si el cliente aún no está listo
  }
  return false;
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
      clientAuthenticated = false;
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

/**
 * Reset completo de sesión (incluso si el cliente está corrupto)
 */
const resetSession = async () => {
  console.log('🧹 Reseteando sesión de WhatsApp completamente...');
  
  try {
    // Intentar desconectar cliente si existe
    if (whatsappClient) {
      try {
        if (whatsappClient.pupBrowser) {
          await whatsappClient.pupBrowser.close().catch(() => {});
        }
        await whatsappClient.destroy().catch(() => {});
      } catch (e) {
        console.log('⚠️ Error destruyendo cliente:', e.message);
      }
    }
    
    // Resetear variables
    whatsappClient = null;
    clientReady = false;
    clientAuthenticated = false;
    lastQR = null;
    initializingLock = false;
    initStartTime = null;
    
    // Eliminar carpetas de sesión
    const sessionPath = path.join(__dirname, '../whatsapp-session');
    const cachePath = path.join(__dirname, '../.wwebjs_cache');
    
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('✅ whatsapp-session eliminada');
    }
    
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log('✅ .wwebjs_cache eliminada');
    }
    
    console.log('✅ Reset completo de WhatsApp - sesión limpia');
    return true;
  } catch (error) {
    console.error('Error en reset de sesión:', error);
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
  isAuthenticated,
  isInitializing: () => initializingLock,
  checkConnection,
  isSimulated: () => IS_SIMULATED,
  desconectarWhatsApp,
  resetSession
};
