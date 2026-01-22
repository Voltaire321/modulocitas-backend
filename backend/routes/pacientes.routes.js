const express = require('express');
const router = express.Router();
const pacientesController = require('../controllers/pacientes.controller');

// Rutas de pacientes
router.get('/', pacientesController.getAllPacientes);
router.get('/:id', pacientesController.getPacienteById);
router.post('/', pacientesController.createPaciente);
router.put('/:id', pacientesController.updatePaciente);

// Historial médico
router.post('/historial', pacientesController.agregarHistorial);

// Antecedentes
router.post('/antecedentes', pacientesController.agregarAntecedente);

// Documentos (con multer para subida de archivos)
router.post('/documentos', pacientesController.upload.single('archivo'), pacientesController.subirDocumento);

// Notas clínicas
router.post('/notas', pacientesController.agregarNota);

// Etiquetas
router.post('/etiquetas', pacientesController.gestionarEtiqueta);

// Signos vitales
router.post('/signos-vitales', pacientesController.registrarSignosVitales);

module.exports = router;
