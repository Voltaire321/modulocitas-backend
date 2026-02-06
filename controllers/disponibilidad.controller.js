const db = require('../config/database');

// Calcular slots de tiempo disponibles
const calcularSlots = (horaInicio, horaFin, duracionMinutos, tiempoEntreMinutos) => {
  const slots = [];
  const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number);
  const [horaFinH, horaFinM] = horaFin.split(':').map(Number);
  
  let minutoActual = horaInicioH * 60 + horaInicioM;
  const minutoFin = horaFinH * 60 + horaFinM;
  
  while (minutoActual + duracionMinutos <= minutoFin) {
    const h = Math.floor(minutoActual / 60);
    const m = minutoActual % 60;
    const hFin = Math.floor((minutoActual + duracionMinutos) / 60);
    const mFin = (minutoActual + duracionMinutos) % 60;
    
    slots.push({
      hora_inicio: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
      hora_fin: `${String(hFin).padStart(2, '0')}:${String(mFin).padStart(2, '0')}:00`
    });
    
    minutoActual += duracionMinutos + tiempoEntreMinutos;
  }
  
  return slots;
};

// Obtener disponibilidad de un médico para un rango de fechas
const getDisponibilidad = async (req, res) => {
  try {
    const { medico_id, fecha_inicio, fecha_fin } = req.query;

    if (!medico_id || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requieren medico_id, fecha_inicio y fecha_fin' 
      });
    }

    // Obtener configuración de horarios
    const [horarios] = await db.query(
      'SELECT * FROM configuracion_horarios WHERE medico_id = ? AND activo = TRUE',
      [medico_id]
    );

    // Obtener días no laborables
    const [diasNoLaborables] = await db.query(
      'SELECT * FROM dias_no_laborables WHERE medico_id = ? AND fecha BETWEEN ? AND ?',
      [medico_id, fecha_inicio, fecha_fin]
    );

    // Obtener citas existentes
    const [citasExistentes] = await db.query(
      `SELECT fecha, hora_inicio, hora_fin 
       FROM citas 
       WHERE medico_id = ? 
       AND fecha BETWEEN ? AND ? 
       AND estado NOT IN ('cancelada', 'rechazada')`,
      [medico_id, fecha_inicio, fecha_fin]
    );

    // Mapear días de la semana
    const diasSemana = {
      0: 'domingo',
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
      6: 'sabado'
    };

    // Generar disponibilidad
    const disponibilidad = [];
    const fechaActual = new Date(fecha_inicio + 'T00:00:00');
    const fechaFinal = new Date(fecha_fin + 'T00:00:00');

    while (fechaActual <= fechaFinal) {
      const fechaStr = fechaActual.toISOString().split('T')[0];
      const diaSemana = diasSemana[fechaActual.getDay()];

      // Verificar si es día no laborable
      const esNoLaborable = diasNoLaborables.some(d => 
        d.fecha.toISOString().split('T')[0] === fechaStr && d.todo_el_dia
      );

      if (!esNoLaborable) {
        // Obtener horarios para este día
        const horariosDelDia = horarios.filter(h => h.dia_semana === diaSemana);

        horariosDelDia.forEach(horario => {
          const slots = calcularSlots(
            horario.hora_inicio,
            horario.hora_fin,
            horario.duracion_cita_minutos,
            horario.tiempo_entre_citas_minutos
          );

          slots.forEach(slot => {
            // Verificar si el slot está ocupado
            const estaOcupado = citasExistentes.some(cita => 
              cita.fecha.toISOString().split('T')[0] === fechaStr &&
              slot.hora_inicio < cita.hora_fin &&
              slot.hora_fin > cita.hora_inicio
            );

            // Verificar si está en horario no laborable parcial
            const enHorarioNoLaborable = diasNoLaborables.some(d =>
              d.fecha.toISOString().split('T')[0] === fechaStr &&
              !d.todo_el_dia &&
              slot.hora_inicio < d.hora_fin &&
              slot.hora_fin > d.hora_inicio
            );

            disponibilidad.push({
              fecha: fechaStr,
              hora_inicio: slot.hora_inicio,
              hora_fin: slot.hora_fin,
              disponible: !estaOcupado && !enHorarioNoLaborable
            });
          });
        });
      }

      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    res.json({ success: true, data: disponibilidad });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    res.status(500).json({ success: false, message: 'Error al obtener disponibilidad' });
  }
};

// Obtener slots disponibles para un día específico
const getSlotsDelDia = async (req, res) => {
  try {
    const { medico_id, fecha } = req.query;

    if (!medico_id || !fecha) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requieren medico_id y fecha' 
      });
    }

    const fechaObj = new Date(fecha + 'T00:00:00');
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaSemana = diasSemana[fechaObj.getDay()];

    // Obtener horarios del día
    const [horarios] = await db.query(
      'SELECT * FROM configuracion_horarios WHERE medico_id = ? AND dia_semana = ? AND activo = TRUE',
      [medico_id, diaSemana]
    );

    if (horarios.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Verificar día no laborable
    const [diasNoLaborables] = await db.query(
      'SELECT * FROM dias_no_laborables WHERE medico_id = ? AND fecha = ?',
      [medico_id, fecha]
    );

    if (diasNoLaborables.length > 0 && diasNoLaborables[0].todo_el_dia) {
      return res.json({ success: true, data: [] });
    }

    // Obtener citas del día
    const [citasExistentes] = await db.query(
      `SELECT hora_inicio, hora_fin 
       FROM citas 
       WHERE medico_id = ? AND fecha = ? AND estado NOT IN ('cancelada', 'rechazada')`,
      [medico_id, fecha]
    );

    // Generar slots
    const slots = [];
    horarios.forEach(horario => {
      const slotsHorario = calcularSlots(
        horario.hora_inicio,
        horario.hora_fin,
        horario.duracion_cita_minutos,
        horario.tiempo_entre_citas_minutos
      );

      slotsHorario.forEach(slot => {
        const estaOcupado = citasExistentes.some(cita =>
          slot.hora_inicio < cita.hora_fin &&
          slot.hora_fin > cita.hora_inicio
        );

        const enHorarioNoLaborable = diasNoLaborables.some(d =>
          !d.todo_el_dia &&
          slot.hora_inicio < d.hora_fin &&
          slot.hora_fin > d.hora_inicio
        );

        slots.push({
          hora_inicio: slot.hora_inicio,
          hora_fin: slot.hora_fin,
          disponible: !estaOcupado && !enHorarioNoLaborable
        });
      });
    });

    res.json({ success: true, data: slots });
  } catch (error) {
    console.error('Error al obtener slots del día:', error);
    res.status(500).json({ success: false, message: 'Error al obtener slots del día' });
  }
};

module.exports = {
  getDisponibilidad,
  getSlotsDelDia
};
