-- Agregar columna para almacenar el ID del evento de Google Calendar
ALTER TABLE citas ADD COLUMN google_event_id VARCHAR(255) DEFAULT NULL;
