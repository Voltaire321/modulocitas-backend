const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);
router.get('/verify', authController.verifyToken);
router.post('/register', authController.register);

module.exports = router;
