const PDFDocument = require('pdfkit');
const db = require('../config/database');

const generateRecetaPDF = async (recetaId) => {
  // Obtener datos de la receta
  const [recetas] = await db.query(
    `SELECT r.*, 
            m.nombre as medico_nombre, 
            m.apellido as medico_apellido,
            m.especialidad,
            m.cedula_profesional,
            m.telefono as medico_telefono,
            m.email as medico_email,
            p.nombre as paciente_nombre, 
            p.apellido as paciente_apellido,
            p.fecha_nacimiento,
            p.genero,
            p.telefono as paciente_telefono,
            TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) as edad
     FROM recetas_medicas r
     JOIN medicos m ON r.medico_id = m.id
     JOIN pacientes p ON r.paciente_id = p.id
     WHERE r.id = ?`,
    [recetaId]
  );

  if (recetas.length === 0) {
    throw new Error('Receta no encontrada');
  }

  const receta = recetas[0];

  // Obtener medicamentos
  const [medicamentos] = await db.query(
    'SELECT * FROM medicamentos_receta WHERE receta_id = ? ORDER BY orden',
    [recetaId]
  );

  // Crear PDF
  const doc = new PDFDocument({ margin: 50 });

  // Encabezado
  doc.fontSize(20).font('Helvetica-Bold').text('RECETA MÉDICA', { align: 'center' });
  doc.moveDown(0.5);

  // Información del médico
  doc.fontSize(10).font('Helvetica');
  doc.rect(50, doc.y, 500, 80).stroke();
  const medicoY = doc.y + 10;
  doc.text(`Dr(a). ${receta.medico_nombre} ${receta.medico_apellido}`, 60, medicoY);
  doc.text(`Especialidad: ${receta.especialidad}`, 60);
  doc.text(`Cédula Profesional: ${receta.cedula_profesional}`, 60);
  doc.text(`Tel: ${receta.medico_telefono || 'N/A'}  |  Email: ${receta.medico_email || 'N/A'}`, 60);
  doc.moveDown(2);

  // Información del paciente
  doc.rect(50, doc.y, 500, 60).stroke();
  const pacienteY = doc.y + 10;
  doc.fontSize(11).font('Helvetica-Bold').text('PACIENTE:', 60, pacienteY);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Nombre: ${receta.paciente_nombre} ${receta.paciente_apellido}`, 60);
  doc.text(`Edad: ${receta.edad || 'N/A'} años  |  Género: ${receta.genero || 'N/A'}`, 60);
  doc.moveDown(2);

  // Fecha y folio
  doc.rect(50, doc.y, 500, 40).stroke();
  const infoY = doc.y + 10;
  // Formatear fecha sin conversión UTC
  const fechaStr = receta.fecha_emision instanceof Date 
    ? receta.fecha_emision.toISOString().split('T')[0] 
    : receta.fecha_emision.toString().split('T')[0];
  const [year, month, day] = fechaStr.split('-');
  const fechaFormateada = `${day}/${month}/${year}`;
  doc.text(`Fecha: ${fechaFormateada}`, 60, infoY);
  doc.text(`Folio: ${receta.folio}`, 350, infoY);
  doc.text(`Vigencia: ${receta.vigencia_dias} días`, 350);
  doc.moveDown(2);

  // Diagnóstico
  doc.fontSize(11).font('Helvetica-Bold').text('DIAGNÓSTICO:', 50);
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text(receta.diagnostico, 50, doc.y, { width: 500, align: 'justify' });
  doc.moveDown(1.5);

  // Prescripción
  doc.fontSize(14).font('Helvetica-Bold').text('Rp/', 50);
  doc.moveDown(0.5);

  medicamentos.forEach((med, index) => {
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(`${index + 1}. ${med.medicamento}`, 60);
    
    doc.fontSize(10).font('Helvetica');
    if (med.presentacion) {
      doc.text(`   Presentación: ${med.presentacion}`, 70);
    }
    doc.text(`   Dosis: ${med.dosis}`, 70);
    doc.text(`   Frecuencia: ${med.frecuencia}`, 70);
    doc.text(`   Duración: ${med.duracion}`, 70);
    if (med.cantidad) {
      doc.text(`   Cantidad: ${med.cantidad}`, 70);
    }
    doc.text(`   Vía de administración: ${med.via_administracion}`, 70);
    if (med.indicaciones_especiales) {
      doc.text(`   Indicaciones: ${med.indicaciones_especiales}`, 70, doc.y, { width: 470 });
    }
    doc.moveDown(0.8);
  });

  // Indicaciones generales
  if (receta.indicaciones) {
    doc.moveDown(1);
    doc.fontSize(11).font('Helvetica-Bold').text('INDICACIONES GENERALES:', 50);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(receta.indicaciones, 50, doc.y, { width: 500, align: 'justify' });
  }

  // Firma
  doc.moveDown(3);
  const firmaY = doc.y;
  doc.moveTo(350, firmaY).lineTo(500, firmaY).stroke();
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text(`Dr(a). ${receta.medico_nombre} ${receta.medico_apellido}`, 350, firmaY + 10);
  doc.fontSize(9).font('Helvetica');
  doc.text(`Cédula: ${receta.cedula_profesional}`, 350);

  // Pie de página
  doc.fontSize(8).font('Helvetica');
  doc.text(
    'Esta receta es válida únicamente para el paciente indicado y por el período especificado.',
    50,
    750,
    { width: 500, align: 'center' }
  );

  doc.end();
  return doc;
};

/**
 * Genera un buffer de PDF para enviar por WhatsApp
 */
const generateRecetaPDFBuffer = async (recetaId) => {
  // Obtener datos de la receta
  const [recetas] = await db.query(
    `SELECT r.*, 
            m.nombre as medico_nombre, 
            m.apellido as medico_apellido,
            m.especialidad,
            m.cedula_profesional,
            m.telefono as medico_telefono,
            m.email as medico_email,
            p.nombre as paciente_nombre, 
            p.apellido as paciente_apellido,
            p.fecha_nacimiento,
            p.genero,
            p.telefono as paciente_telefono,
            TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) as edad
     FROM recetas_medicas r
     JOIN medicos m ON r.medico_id = m.id
     JOIN pacientes p ON r.paciente_id = p.id
     WHERE r.id = ?`,
    [recetaId]
  );

  if (recetas.length === 0) {
    throw new Error('Receta no encontrada');
  }

  const receta = recetas[0];

  // Obtener medicamentos
  const [medicamentos] = await db.query(
    'SELECT * FROM medicamentos_receta WHERE receta_id = ? ORDER BY id',
    [recetaId]
  );

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header con logo
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#2563eb');
    doc.text('RECETA MÉDICA', 50, 50, { align: 'center' });

    // Información del médico
    doc.fontSize(10).font('Helvetica').fillColor('#000');
    doc.text(`Dr(a). ${receta.medico_nombre} ${receta.medico_apellido}`, 50, 90);
    doc.fontSize(9);
    doc.text(`Especialidad: ${receta.especialidad}`, 50);
    doc.text(`Cédula: ${receta.cedula_profesional}`, 50);
    doc.moveDown(1);

    // Información del paciente
    doc.rect(50, doc.y, 500, 60).stroke();
    const pacienteY = doc.y + 10;
    doc.fontSize(10).font('Helvetica-Bold').text('Datos del Paciente:', 60, pacienteY);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Nombre: ${receta.paciente_nombre} ${receta.paciente_apellido}`, 60);
    doc.text(`Edad: ${receta.edad} años`, 350, pacienteY + 15);
    doc.text(`Género: ${receta.genero === 'M' ? 'Masculino' : receta.genero === 'F' ? 'Femenino' : 'Otro'}`, 350);
    doc.moveDown(2);

    // Fecha y folio
    doc.rect(50, doc.y, 500, 40).stroke();
    const infoY = doc.y + 10;
    const fechaStr = receta.fecha_emision instanceof Date 
      ? receta.fecha_emision.toISOString().split('T')[0] 
      : receta.fecha_emision.toString().split('T')[0];
    const [year, month, day] = fechaStr.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;
    doc.text(`Fecha: ${fechaFormateada}`, 60, infoY);
    doc.text(`Folio: ${receta.folio}`, 350, infoY);
    doc.text(`Vigencia: ${receta.vigencia_dias} días`, 350);
    doc.moveDown(2);

    // Diagnóstico
    doc.fontSize(11).font('Helvetica-Bold').text('DIAGNÓSTICO:', 50);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(receta.diagnostico, 50, doc.y, { width: 500, align: 'justify' });
    doc.moveDown(1.5);

    // Medicamentos
    doc.fontSize(11).font('Helvetica-Bold').text('MEDICAMENTOS:', 50);
    doc.moveDown(0.5);

    medicamentos.forEach((med, index) => {
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`${index + 1}. ${med.medicamento}`, 60);
      
      if (med.presentacion) {
        doc.fontSize(9).font('Helvetica');
        doc.text(`Presentación: ${med.presentacion}`, 70);
      }
      
      doc.text(`Dosis: ${med.dosis}`, 70);
      doc.text(`Frecuencia: ${med.frecuencia}`, 70);
      doc.text(`Duración: ${med.duracion}`, 70);
      
      if (med.cantidad) {
        doc.text(`Cantidad a dispensar: ${med.cantidad}`, 70);
      }
      
      doc.text(`Vía de administración: ${med.via_administracion}`, 70);
      
      if (med.indicaciones_especiales) {
        doc.text(`Indicaciones: ${med.indicaciones_especiales}`, 70, doc.y, { width: 460 });
      }
      
      doc.moveDown(0.8);
    });

    // Indicaciones generales
    if (receta.indicaciones) {
      doc.moveDown(1);
      doc.fontSize(11).font('Helvetica-Bold').text('INDICACIONES GENERALES:', 50);
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(receta.indicaciones, 50, doc.y, { width: 500, align: 'justify' });
    }

    // Firma
    doc.moveDown(3);
    const firmaY = doc.y;
    doc.moveTo(350, firmaY).lineTo(500, firmaY).stroke();
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Dr(a). ${receta.medico_nombre} ${receta.medico_apellido}`, 350, firmaY + 10);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Cédula: ${receta.cedula_profesional}`, 350);

    // Pie de página
    doc.fontSize(8).font('Helvetica');
    doc.text(
      'Esta receta es válida únicamente para el paciente indicado y por el período especificado.',
      50,
      750,
      { width: 500, align: 'center' }
    );

    doc.end();
  });
};

module.exports = {
  generateRecetaPDF,
  generateRecetaPDFBuffer
};
