const express = require('express');
const router = express.Router();
const recetasController = require('../controllers/recetas.controller');
const { generateRecetaPDF, generateRecetaPDFBuffer } = require('../services/pdf.service');
const { enviarMensajeWhatsApp, enviarDocumentoWhatsApp } = require('../services/whatsapp.service');

router.post('/', recetasController.createReceta);
router.get('/medico/:medico_id', recetasController.getRecetasByMedico);
router.get('/folio/:folio', recetasController.getRecetaByFolio);
router.get('/:id', recetasController.getRecetaById);

// Descargar PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const pdfDoc = await generateRecetaPDF(id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receta-${id}.pdf`);
    
    pdfDoc.pipe(res);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enviar por email
router.post('/:id/enviar', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    
    const nodemailer = require('nodemailer');
    
    // Configurar transporter
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Generar PDF
    const pdfDoc = await generateRecetaPDF(id);
    const chunks = [];
    
    pdfDoc.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      pdfDoc.on('end', resolve);
      pdfDoc.on('error', reject);
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Enviar email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Receta Médica',
      html: `
        <h2>Receta Médica</h2>
        <p>Adjunto encontrará su receta médica en formato PDF.</p>
        <p>Por favor conserve este documento para su registro.</p>
      `,
      attachments: [
        {
          filename: `receta-${id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    res.json({ success: true, message: 'Receta enviada exitosamente' });
  } catch (error) {
    console.error('Error al enviar receta:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enviar por WhatsApp
router.post('/:id/whatsapp', async (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../config/database');
    
    // Obtener la información de la receta y del paciente
    const [recetas] = await db.query(`
      SELECT 
        r.*,
        CONCAT(p.nombre, ' ', p.apellido) as paciente_nombre,
        p.telefono as paciente_telefono,
        CONCAT(m.nombre, ' ', m.apellido) as medico_nombre
      FROM recetas_medicas r
      INNER JOIN pacientes p ON r.paciente_id = p.id
      INNER JOIN medicos m ON r.medico_id = m.id
      WHERE r.id = ?
    `, [id]);

    if (!recetas || recetas.length === 0) {
      return res.status(404).json({ success: false, message: 'Receta no encontrada' });
    }

    const receta = recetas[0];

    if (!receta.paciente_telefono) {
      return res.status(400).json({ 
        success: false, 
        message: 'El paciente no tiene un número de teléfono registrado' 
      });
    }

    // Obtener los medicamentos
    const [medicamentos] = await db.query(
      'SELECT * FROM medicamentos_receta WHERE receta_id = ?',
      [id]
    );

    // Crear el mensaje de WhatsApp
    // Formatear fecha sin conversión UTC
    const fechaStr = receta.fecha_emision instanceof Date 
      ? receta.fecha_emision.toISOString().split('T')[0] 
      : receta.fecha_emision.toString().split('T')[0];
    const [year, month, day] = fechaStr.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;
    
    let mensaje = `📋 *RECETA MÉDICA*\\n\\n`;
    mensaje += `*Folio:* ${receta.folio}\\n`;
    mensaje += `*Paciente:* ${receta.paciente_nombre}\\n`;
    mensaje += `*Médico:* ${receta.medico_nombre}\\n`;
    mensaje += `*Fecha:* ${fechaFormateada}\\n\\n`;
    mensaje += `*Diagnóstico:*\\n${receta.diagnostico}\\n\\n`;
    
    if (medicamentos && medicamentos.length > 0) {
      mensaje += `*Medicamentos:*\\n`;
      medicamentos.forEach((med, index) => {
        mensaje += `\\n${index + 1}. *${med.medicamento}*`;
        if (med.presentacion) mensaje += ` (${med.presentacion})`;
        mensaje += `\\n   - Dosis: ${med.dosis}`;
        mensaje += `\\n   - Frecuencia: ${med.frecuencia}`;
        mensaje += `\\n   - Duración: ${med.duracion}`;
        if (med.cantidad) mensaje += `\\n   - Cantidad: ${med.cantidad}`;
        mensaje += `\\n   - Vía: ${med.via_administracion}`;
        if (med.indicaciones_especiales) {
          mensaje += `\\n   - Indicaciones: ${med.indicaciones_especiales}`;
        }
      });
    }

    if (receta.indicaciones) {
      mensaje += `\\n\\n*Indicaciones Generales:*\\n${receta.indicaciones}`;
    }

    if (receta.vigencia_dias) {
      // Calcular vigencia sin conversión UTC
      const vigenciaFechaStr = receta.fecha_emision instanceof Date 
        ? receta.fecha_emision.toISOString().split('T')[0] 
        : receta.fecha_emision.toString().split('T')[0];
      const [year, month, day] = vigenciaFechaStr.split('-');
      const fechaEmision = new Date(year, parseInt(month) - 1, parseInt(day));
      fechaEmision.setDate(fechaEmision.getDate() + receta.vigencia_dias);
      const vigenciaDay = fechaEmision.getDate().toString().padStart(2, '0');
      const vigenciaMonth = (fechaEmision.getMonth() + 1).toString().padStart(2, '0');
      const vigenciaYear = fechaEmision.getFullYear();
      mensaje += `\\n\\n*Vigencia:* Hasta el ${vigenciaDay}/${vigenciaMonth}/${vigenciaYear}`;
    }

    mensaje += `\\n\\n_Este es un documento médico. Conserve para su registro._`;

    // Generar PDF
    console.log('📄 Generando PDF de la receta...');
    const pdfBuffer = await generateRecetaPDFBuffer(id);

    // Enviar PDF por WhatsApp
    const caption = `📋 *RECETA MÉDICA*\n\nFolio: ${receta.folio}\nPaciente: ${receta.paciente_nombre}\nMédico: ${receta.medico_nombre}\nFecha: ${fechaFormateada}`;
    
    const whatsappResult = await enviarDocumentoWhatsApp(
      receta.paciente_telefono, 
      pdfBuffer, 
      `Receta_${receta.folio}.pdf`,
      caption
    );

    if (whatsappResult.success) {
      res.json({ 
        success: true, 
        message: 'Receta enviada por WhatsApp exitosamente' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: whatsappResult.error || 'Error al enviar mensaje de WhatsApp' 
      });
    }

  } catch (error) {
    console.error('Error al enviar receta por WhatsApp:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
