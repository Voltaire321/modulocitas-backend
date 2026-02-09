const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const passwordResetService = require('../services/password-reset.service');

// Login
const login = async (req, res) => {
  try {
    const { username, password, email, whatsapp } = req.body;

    // Determinar el identificador (email, username o whatsapp)
    const identifier = email || username || whatsapp;

    console.log('🔍 Login attempt:', { 
      email, 
      username, 
      whatsapp, 
      identifier, 
      hasPassword: !!password 
    });

    if (!identifier || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Credenciales requeridas (email/usuario y contraseña)' 
      });
    }

    // Buscar usuario por email, username o whatsapp
    const [usuarios] = await db.query(
      `SELECT ua.*, m.nombre as medico_nombre, m.apellido as medico_apellido
       FROM usuarios_admin ua
       LEFT JOIN medicos m ON ua.medico_id = m.id
       WHERE (ua.email = ? OR ua.username = ? OR ua.whatsapp = ?) 
       AND ua.activo = TRUE`,
      [identifier, identifier, identifier]
    );

    console.log('👥 Usuarios encontrados:', usuarios.length);
    if (usuarios.length > 0) {
      console.log('📧 Usuario encontrado:', {
        id: usuarios[0].id,
        username: usuarios[0].username,
        email: usuarios[0].email,
        hasPasswordHash: !!usuarios[0].password_hash
      });
    }

    if (usuarios.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }

    const usuario = usuarios[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        rol: 'doctor', // Siempre doctor, ya no hay roles múltiples
        medico_id: usuario.medico_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        usuario: {
          id: usuario.id,
          username: usuario.username,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          whatsapp: usuario.whatsapp,
          rol: usuario.rol,
          medico_id: usuario.medico_id,
          medico_nombre: usuario.medico_nombre,
          medico_apellido: usuario.medico_apellido
        }
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

// Verificar token
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [usuarios] = await db.query(
      `SELECT ua.id, ua.username, ua.nombre, ua.apellido, ua.email, ua.rol, ua.medico_id,
              m.nombre as medico_nombre, m.apellido as medico_apellido
       FROM usuarios_admin ua
       LEFT JOIN medicos m ON ua.medico_id = m.id
       WHERE ua.id = ? AND ua.activo = TRUE`,
      [decoded.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: usuarios[0] });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

// Registrar usuario admin
const register = async (req, res) => {
  try {
    const { medico_id, username, password, nombre, apellido, email, rol } = req.body;

    // Verificar si el usuario ya existe
    const [usuariosExistentes] = await db.query(
      'SELECT id FROM usuarios_admin WHERE username = ? OR email = ?',
      [username, email]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El usuario o email ya existe' 
      });
    }

    // Hash de la contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Crear usuario
    const [result] = await db.query(
      'INSERT INTO usuarios_admin (medico_id, username, password_hash, nombre, apellido, email, rol) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [medico_id, username, password_hash, nombre, apellido, email, rol || 'secretaria']
    );

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ success: false, message: 'Error al registrar usuario' });
  }
};

// Solicitar recuperación de contraseña
const requestPasswordReset = async (req, res) => {
  try {
    console.log('📥 Request body:', req.body);
    const { email } = req.body;

    console.log('📧 Email recibido:', email);

    if (!email) {
      console.log('❌ Email no proporcionado');
      return res.status(400).json({ 
        success: false, 
        message: 'El email es requerido' 
      });
    }

    console.log('🔄 Llamando a passwordResetService...');
    const result = await passwordResetService.requestPasswordReset(email);
    
    console.log('✅ Resultado del servicio:', result);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error al solicitar reset:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al procesar la solicitud' 
    });
  }
};

// Verificar código de recuperación
const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email y código son requeridos' 
      });
    }

    const result = await passwordResetService.verifyResetCode(email, code);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al verificar el código' 
    });
  }
};

// Resetear contraseña
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, código y nueva contraseña son requeridos' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    const result = await passwordResetService.resetPassword(email, code, newPassword);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al cambiar la contraseña' 
    });
  }
};

module.exports = {
  login,
  verifyToken,
  register,
  requestPasswordReset,
  verifyResetCode,
  resetPassword
};
