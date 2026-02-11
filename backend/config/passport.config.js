/**
 * Configuración de Passport.js para OAuth Social Login
 * Estrategias: Facebook y Google OAuth 2.0
 */

const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');

// Cargar variables de entorno
require('dotenv').config();

/**
 * Serialización de usuario para sesiones (no usado en JWT, pero requerido por Passport)
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query('SELECT * FROM usuarios_admin WHERE id = ?', [id]);
    done(null, rows[0]);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Estrategia de Facebook OAuth 2.0
 */
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/api/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name', 'displayName', 'picture.type(large)'],
    enableProof: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Facebook OAuth - Perfil recibido:', profile.id);
      
      // Extraer datos del perfil de Facebook
      const facebookId = profile.id;
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const displayName = profile.displayName || `${profile.name.givenName} ${profile.name.familyName}`;
      const picture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      // Validar que el email existe
      if (!email) {
        return done(new Error('No se pudo obtener el email de Facebook'), null);
      }

      // Buscar usuario existente por oauth_provider y oauth_id
      const [existingOAuthUser] = await db.query(
        'SELECT * FROM usuarios_admin WHERE oauth_provider = ? AND oauth_id = ?',
        ['facebook', facebookId]
      );

      if (existingOAuthUser.length > 0) {
        // Usuario encontrado - actualizar tokens y última conexión
        await db.query(
          `UPDATE usuarios_admin 
           SET oauth_access_token = ?, 
               oauth_refresh_token = ?, 
               oauth_updated_at = NOW(),
               oauth_picture = ?
           WHERE id = ?`,
          [accessToken, refreshToken, picture, existingOAuthUser[0].id]
        );
        
        // Obtener datos ACTUALIZADOS del usuario (incluyendo rol actual)
        const [updatedUser] = await db.query(
          'SELECT * FROM usuarios_admin WHERE id = ?',
          [existingOAuthUser[0].id]
        );
        
        return done(null, updatedUser[0]);
      }

      // Verificar si existe usuario con el mismo email (vincular cuentas)
      const [existingEmailUser] = await db.query(
        'SELECT * FROM usuarios_admin WHERE email = ?',
        [email]
      );

      if (existingEmailUser.length > 0) {
        // Vincular cuenta OAuth a cuenta existente
        await db.query(
          `UPDATE usuarios_admin 
           SET oauth_provider = ?,
               oauth_id = ?,
               oauth_access_token = ?,
               oauth_refresh_token = ?,
               oauth_picture = ?,
               oauth_created_at = NOW(),
               oauth_updated_at = NOW()
           WHERE id = ?`,
          ['facebook', facebookId, accessToken, refreshToken, picture, existingEmailUser[0].id]
        );

        const [updatedUser] = await db.query(
          'SELECT * FROM usuarios_admin WHERE id = ?',
          [existingEmailUser[0].id]
        );
        
        return done(null, updatedUser[0]);
      }

      // Crear nuevo usuario
      // Generar username único desde el email
      const username = email.split('@')[0] + '_' + Date.now().toString().slice(-6);
      
      const [result] = await db.query(
        `INSERT INTO usuarios_admin 
         (username, email, nombre, oauth_provider, oauth_id, oauth_access_token, oauth_refresh_token, oauth_picture, oauth_created_at, oauth_updated_at, rol) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
        [username, email, displayName, 'facebook', facebookId, accessToken, refreshToken, picture, 'superadmin']
      );

      const [newUser] = await db.query(
        'SELECT * FROM usuarios_admin WHERE id = ?',
        [result.insertId]
      );

      console.log('Nuevo usuario creado desde Facebook:', newUser[0].email);
      return done(null, newUser[0]);

    } catch (error) {
      console.error('Error en estrategia de Facebook:', error);
      return done(error, null);
    }
  }
));

/**
 * Estrategia de Google OAuth 2.0
 */
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth - Perfil recibido:', profile.id);
      
      // Extraer datos del perfil de Google
      const googleId = profile.id;
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const displayName = profile.displayName;
      const picture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      // Validar que el email existe
      if (!email) {
        return done(new Error('No se pudo obtener el email de Google'), null);
      }

      // Buscar usuario existente por oauth_provider y oauth_id
      const [existingOAuthUser] = await db.query(
        'SELECT * FROM usuarios_admin WHERE oauth_provider = ? AND oauth_id = ?',
        ['google', googleId]
      );

      if (existingOAuthUser.length > 0) {
        // Usuario encontrado - actualizar tokens y última conexión
        await db.query(
          `UPDATE usuarios_admin 
           SET oauth_access_token = ?, 
               oauth_refresh_token = ?, 
               oauth_updated_at = NOW(),
               oauth_picture = ?
           WHERE id = ?`,
          [accessToken, refreshToken, picture, existingOAuthUser[0].id]
        );
        
        // Obtener datos ACTUALIZADOS del usuario (incluyendo rol actual)
        const [updatedUser] = await db.query(
          'SELECT * FROM usuarios_admin WHERE id = ?',
          [existingOAuthUser[0].id]
        );
        
        return done(null, updatedUser[0]);
      }

      // Verificar si existe usuario con el mismo email (vincular cuentas)
      const [existingEmailUser] = await db.query(
        'SELECT * FROM usuarios_admin WHERE email = ?',
        [email]
      );

      if (existingEmailUser.length > 0) {
        // Vincular cuenta OAuth a cuenta existente
        await db.query(
          `UPDATE usuarios_admin 
           SET oauth_provider = ?,
               oauth_id = ?,
               oauth_access_token = ?,
               oauth_refresh_token = ?,
               oauth_picture = ?,
               oauth_created_at = NOW(),
               oauth_updated_at = NOW()
           WHERE id = ?`,
          ['google', googleId, accessToken, refreshToken, picture, existingEmailUser[0].id]
        );

        const [updatedUser] = await db.query(
          'SELECT * FROM usuarios_admin WHERE id = ?',
          [existingEmailUser[0].id]
        );
        
        return done(null, updatedUser[0]);
      }

      // Crear nuevo usuario
      // Generar username único desde el email
      const username = email.split('@')[0] + '_' + Date.now().toString().slice(-6);
      
      const [result] = await db.query(
        `INSERT INTO usuarios_admin 
         (username, email, nombre, oauth_provider, oauth_id, oauth_access_token, oauth_refresh_token, oauth_picture, oauth_created_at, oauth_updated_at, rol) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
        [username, email, displayName, 'google', googleId, accessToken, refreshToken, picture, 'superadmin']
      );

      const [newUser] = await db.query(
        'SELECT * FROM usuarios_admin WHERE id = ?',
        [result.insertId]
      );

      console.log('Nuevo usuario creado desde Google:', newUser[0].email);
      return done(null, newUser[0]);

    } catch (error) {
      console.error('Error en estrategia de Google:', error);
      return done(error, null);
    }
  }
));

module.exports = passport;
