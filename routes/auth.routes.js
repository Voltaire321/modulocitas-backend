const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Autenticación
router.post('/login', authController.login);
router.get('/verify', authController.verifyToken);
router.post('/register', authController.register);

// Recuperación de contraseña
router.post('/password-reset/request', authController.requestPasswordReset);
router.post('/password-reset/verify', authController.verifyResetCode);
router.post('/password-reset/reset', authController.resetPassword);

module.exports = router;
