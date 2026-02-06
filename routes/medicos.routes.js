const express = require('express');
const router = express.Router();

console.log('🔧 Inicializando medicos.routes...');
const medicosController = require('../controllers/medicos.controller');
console.log('✅ medicosController cargado correctamente');

// Solo endpoints necesarios para un médico fijo
router.get('/info', (req, res, next) => {
  console.log('🎯 Ruta /info ejecutándose en medicos.routes');
  medicosController.getMedicoInfo(req, res, next);
});

router.put('/info', (req, res, next) => {
  console.log('🎯 Ruta PUT /info ejecutándose en medicos.routes');
  medicosController.updateMedicoInfo(req, res, next);
});

console.log('📝 Rutas registradas en medicos.routes: GET /info, PUT /info');
module.exports = router;
