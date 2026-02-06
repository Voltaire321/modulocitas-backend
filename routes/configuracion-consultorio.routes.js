const express = require('express');
const router = express.Router();
const {
  getConfiguracion,
  upsertConfiguracion,
  getTiposConsulta,
  createTipoConsulta,
  updateTipoConsulta,
  deleteTipoConsulta,
  getEspecialidades,
  createEspecialidad,
  updateEspecialidad,
  deleteEspecialidad,
  getMetodosPago,
  createMetodoPago,
  updateMetodoPago,
  deleteMetodoPago,
  getDiasFestivos,
  createDiaFestivo,
  deleteDiaFestivo
} = require('../controllers/configuracion-consultorio.controller');

// ============================================
// CONFIGURACIÓN GENERAL
// ============================================
router.get('/:medicoId', getConfiguracion);
router.post('/:medicoId', upsertConfiguracion);
router.put('/:medicoId', upsertConfiguracion);

// ============================================
// TIPOS DE CONSULTA
// ============================================
router.get('/:medicoId/tipos-consulta', getTiposConsulta);
router.post('/:medicoId/tipos-consulta', createTipoConsulta);
router.put('/:medicoId/tipos-consulta/:id', updateTipoConsulta);
router.delete('/:medicoId/tipos-consulta/:id', deleteTipoConsulta);

// ============================================
// ESPECIALIDADES
// ============================================
router.get('/:medicoId/especialidades', getEspecialidades);
router.post('/:medicoId/especialidades', createEspecialidad);
router.put('/:medicoId/especialidades/:id', updateEspecialidad);
router.delete('/:medicoId/especialidades/:id', deleteEspecialidad);

// ============================================
// MÉTODOS DE PAGO
// ============================================
router.get('/:medicoId/metodos-pago', getMetodosPago);
router.post('/:medicoId/metodos-pago', createMetodoPago);
router.put('/:medicoId/metodos-pago/:id', updateMetodoPago);
router.delete('/:medicoId/metodos-pago/:id', deleteMetodoPago);

// ============================================
// DÍAS FESTIVOS
// ============================================
router.get('/:medicoId/dias-festivos', getDiasFestivos);
router.post('/:medicoId/dias-festivos', createDiaFestivo);
router.delete('/:medicoId/dias-festivos/:id', deleteDiaFestivo);

module.exports = router;
