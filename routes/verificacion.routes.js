const express = require('express');
const router = express.Router();
const { 
  enviarCodigoVerificacion, 
  verificarCodigo, 
  esTelefonoVerificado 
} = require('../services/verificacion.service');

// Enviar código de verificación
router.post('/enviar-codigo', async (req, res) => {
  try {
    const { telefono } = req.body;

    if (!telefono) {
      return res.status(400).json({ 
        success: false, 
        message: 'El teléfono es requerido' 
      });
    }

    // Validar formato de teléfono (10 dígitos)
    const telefonoLimpio = telefono.replace(/\D/g, '');
    if (telefonoLimpio.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'El teléfono debe tener 10 dígitos' 
      });
    }

    const result = await enviarCodigoVerificacion(telefonoLimpio);
    res.json(result);
  } catch (error) {
    console.error('Error enviando código:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al enviar código de verificación. Verifica que WhatsApp esté conectado.' 
    });
  }
});

// Verificar código ingresado
router.post('/verificar-codigo', async (req, res) => {
  try {
    const { telefono, codigo } = req.body;

    if (!telefono || !codigo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teléfono y código son requeridos' 
      });
    }

    const telefonoLimpio = telefono.replace(/\D/g, '');
    const result = await verificarCodigo(telefonoLimpio, codigo);
    res.json(result);
  } catch (error) {
    console.error('Error verificando código:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al verificar código' 
    });
  }
});

// Verificar estado de un teléfono
router.get('/estado/:telefono', async (req, res) => {
  try {
    const { telefono } = req.params;
    const telefonoLimpio = telefono.replace(/\D/g, '');
    const verificado = await esTelefonoVerificado(telefonoLimpio);
    
    res.json({ 
      success: true, 
      verificado 
    });
  } catch (error) {
    console.error('Error verificando estado:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al verificar estado' 
    });
  }
});

module.exports = router;
