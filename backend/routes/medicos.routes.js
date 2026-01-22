const express = require('express');
const router = express.Router();
const medicosController = require('../controllers/medicos.controller');

// Solo endpoints necesarios para un médico fijo
router.get('/info', medicosController.getMedicoInfo);
router.put('/info', medicosController.updateMedicoInfo);

module.exports = router;
