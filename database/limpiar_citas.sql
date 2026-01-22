-- Script para limpiar todas las citas de la base de datos
-- Esto eliminará todas las citas y reiniciará el autoincremento

-- Deshabilitar comprobación de claves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Eliminar todas las notificaciones relacionadas con citas
DELETE FROM notificaciones WHERE tipo IN ('nueva_cita', 'cita_aceptada', 'cita_rechazada', 'cita_cancelada');

-- Eliminar todas las recetas
DELETE FROM recetas;

-- Eliminar todas las citas
DELETE FROM citas;

-- Reiniciar el autoincremento de las tablas
ALTER TABLE citas AUTO_INCREMENT = 1;
ALTER TABLE recetas AUTO_INCREMENT = 1;
ALTER TABLE notificaciones AUTO_INCREMENT = 1;

-- Reactivar comprobación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- Mostrar confirmación
SELECT 'Base de datos limpiada exitosamente' AS resultado;
