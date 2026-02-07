const express = require('express');
const router = express.Router();
const medicosController = require('../controllers/medicos.controller');
const connection = require('../config/database');

// Solo endpoints necesarios para un médico fijo
router.get('/info', medicosController.getMedicoInfo);
router.put('/info', medicosController.updateMedicoInfo);

// GET /api/medicos/admin/all - Listar todos los médicos (para admin)
router.get('/admin/all', async (req, res) => {
  try {
    const [medicos] = await connection.query(
      `SELECT 
        id, nombre, apellido, especialidad, email, telefono, 
        cedula_profesional, activo, configuracion_completada,
        created_at, updated_at
      FROM medicos 
      ORDER BY nombre ASC`
    );
    
    res.json({ success: true, data: medicos });
  } catch (error) {
    console.error('Error obteniendo médicos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener médicos' });
  }
});

module.exports = router;
