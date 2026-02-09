const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

// Configuración de multer para subir logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/branding');
    // Crear directorio si no existe
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + Date.now() + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB máximo
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// Ruta del archivo de configuración
const BRANDING_CONFIG_PATH = path.join(__dirname, '../config/branding.config.js');
const BRANDING_DATA_PATH = path.join(__dirname, '../data/branding.json');

/**
 * Obtener configuración actual de branding
 */
router.get('/config', async (req, res) => {
  try {
    // Primero intentar leer desde archivo JSON (configuración personalizada)
    try {
      const data = await fs.readFile(BRANDING_DATA_PATH, 'utf-8');
      const brandingData = JSON.parse(data);
      return res.json({
        success: true,
        config: brandingData,
        source: 'custom'
      });
    } catch (err) {
      // Si no existe archivo JSON, leer configuración por defecto
      const defaultConfig = require('../config/branding.config');
      return res.json({
        success: true,
        config: defaultConfig,
        source: 'default'
      });
    }
  } catch (error) {
    console.error('Error al obtener configuración de branding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Actualizar configuración de branding
 */
router.put('/config', async (req, res) => {
  try {
    const newConfig = req.body;
    
    // Validar configuración básica
    if (!newConfig.empresa || !newConfig.empresa.nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la empresa es obligatorio'
      });
    }

    // Crear directorio data si no existe
    const dataDir = path.join(__dirname, '../data');
    await fs.mkdir(dataDir, { recursive: true });

    // Guardar configuración en JSON
    await fs.writeFile(
      BRANDING_DATA_PATH,
      JSON.stringify(newConfig, null, 2),
      'utf-8'
    );

    console.log('✅ Configuración de branding actualizada');

    res.json({
      success: true,
      message: 'Configuración actualizada correctamente',
      config: newConfig
    });
  } catch (error) {
    console.error('Error al actualizar branding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Subir logo
 */
router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo'
      });
    }

    // URL del logo (accesible desde el frontend)
    const logoUrl = `/uploads/branding/${req.file.filename}`;

    // Actualizar configuración con nueva URL del logo
    let config;
    try {
      const data = await fs.readFile(BRANDING_DATA_PATH, 'utf-8');
      config = JSON.parse(data);
    } catch (err) {
      // Si no existe, usar configuración por defecto
      config = require('../config/branding.config');
    }

    config.logo.url = logoUrl;
    config.logo.uploadedAt = new Date().toISOString();

    // Guardar
    const dataDir = path.join(__dirname, '../data');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(
      BRANDING_DATA_PATH,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    res.json({
      success: true,
      message: 'Logo subido correctamente',
      logoUrl: logoUrl,
      fileName: req.file.filename
    });
  } catch (error) {
    console.error('Error al subir logo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Restablecer configuración a valores por defecto
 */
router.post('/reset', async (req, res) => {
  try {
    // Eliminar archivo de configuración personalizada
    try {
      await fs.unlink(BRANDING_DATA_PATH);
    } catch (err) {
      // No importa si no existe
    }

    const defaultConfig = require('../config/branding.config');

    res.json({
      success: true,
      message: 'Configuración restablecida a valores por defecto',
      config: defaultConfig
    });
  } catch (error) {
    console.error('Error al restablecer configuración:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Previsualizar email con configuración actual
 */
router.post('/preview-email', async (req, res) => {
  try {
    const { tipo } = req.body;
    
    // Cargar configuración actual
    let config;
    try {
      const data = await fs.readFile(BRANDING_DATA_PATH, 'utf-8');
      config = JSON.parse(data);
    } catch (err) {
      config = require('../config/branding.config');
    }

    // Generar HTML de previsualización
    const { emailPrueba, emailCita } = require('../utils/emailTemplates');
    
    let html;
    if (tipo === 'cita') {
      html = emailCita({
        paciente: { nombre: 'Juan Pérez' },
        doctor: { nombre: 'Dr. García López' },
        fecha: '15 de Febrero de 2026',
        hora: '10:30 AM',
        especialidad: 'Medicina General'
      });
    } else {
      html = emailPrueba('Este es un email de previsualización con tu configuración personalizada.');
    }

    res.json({
      success: true,
      html: html
    });
  } catch (error) {
    console.error('Error al generar previsualización:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
