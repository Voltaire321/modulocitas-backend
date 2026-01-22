const express = require('express');
const router = express.Router();
const disponibilidadController = require('../controllers/disponibilidad.controller');

router.get('/', disponibilidadController.getDisponibilidad);
router.get('/slots', disponibilidadController.getSlotsDelDia);

module.exports = router;
