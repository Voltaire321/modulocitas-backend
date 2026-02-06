const express = require('express');
const router = express.Router();
const horariosController = require('../controllers/horarios.controller');

router.get('/medico/:medico_id', horariosController.getHorariosByMedico);
router.post('/', horariosController.createHorario);
router.put('/:id', horariosController.updateHorario);
router.delete('/:id', horariosController.deleteHorario);

router.get('/dias-no-laborables/:medico_id', horariosController.getDiasNoLaborables);
router.post('/dias-no-laborables', horariosController.createDiaNoLaborable);
router.delete('/dias-no-laborables/:id', horariosController.deleteDiaNoLaborable);

module.exports = router;
