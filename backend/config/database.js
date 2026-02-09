const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración del pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'cesargoop',
  database: process.env.DB_NAME || 'listexa',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000,
  timezone: '+00:00',
  charset: 'utf8mb4',
  // Reconectar automáticamente en Hostinger
  maxIdle: 3,
  idleTimeout: 60000
});

// Verificar conexión al iniciar
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a la base de datos MySQL');
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error.message);
    console.error('Verifica que MySQL esté ejecutándose en el puerto', process.env.DB_PORT);
  }
};

testConnection();

module.exports = pool;
