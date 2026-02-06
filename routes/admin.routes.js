const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

router.get('/dashboard', adminController.getDashboardStats);
router.get('/configuracion', adminController.getConfiguracion);
router.put('/configuracion', adminController.updateConfiguracion);

module.exports = router;
