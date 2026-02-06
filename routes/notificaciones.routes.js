const express = require('express');
const router = express.Router();
const notificacionesController = require('../controllers/notificaciones.controller');

// Obtener notificaciones de un usuario
router.get('/:usuarioTipo/:usuarioId', notificacionesController.getNotificaciones);

// Marcar notificación como leída
router.put('/:id/leida', notificacionesController.marcarComoLeida);

// Marcar todas como leídas
router.put('/:usuarioTipo/:usuarioId/marcar-todas', notificacionesController.marcarTodasComoLeidas);

// Aceptar o rechazar cita
router.put('/cita/:id/estado', notificacionesController.actualizarEstadoCita);

// Eliminar notificación específica
router.delete('/:id', notificacionesController.eliminarNotificacion);

// Eliminar notificaciones leídas
router.delete('/:usuarioTipo/:usuarioId/leidas', notificacionesController.eliminarLeidas);

// Eliminar todas las notificaciones
router.delete('/:usuarioTipo/:usuarioId/todas', notificacionesController.eliminarTodas);

module.exports = router;
