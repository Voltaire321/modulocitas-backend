const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuario y contraseña son requeridos' 
      });
    }

    // Buscar usuario
    const [usuarios] = await db.query(
      `SELECT ua.*, m.nombre as medico_nombre, m.apellido as medico_apellido
       FROM usuarios_admin ua
       LEFT JOIN medicos m ON ua.medico_id = m.id
       WHERE ua.username = ? AND ua.activo = TRUE`,
      [username]
    );

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

module.exports = {
  login,
  verifyToken,
  register
};
