const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citas.controller');

router.get('/', citasController.getAllCitas);
router.get('/dia', citasController.getCitasDelDia);
router.get('/:id', citasController.getCitaById);
router.post('/', citasController.createCita);
router.put('/:id/estado', citasController.updateCitaEstado);
router.post('/:id/cancelar', citasController.cancelCita);

module.exports = router;
