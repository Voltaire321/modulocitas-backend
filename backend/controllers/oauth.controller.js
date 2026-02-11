/**
 * Controlador de Autenticación OAuth
 * Maneja login con Facebook y Google, validación de tokens y callbacks
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const facebookAuthService = require('../services/facebook-auth.service');
const googleAuthService = require('../services/google-auth.service');

class OAuthController {
  /**
   * Callback de Facebook OAuth - Maneja la respuesta después de autenticación
   * Passport.js ya procesó el perfil, este método genera JWT y redirige
   */
  async facebookCallback(req, res) {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
      }

      // Generar JWT token
      const token = jwt.sign(
        { 
          id: req.user.id, 
          email: req.user.email, 
          rol: req.user.rol,
          oauth_provider: 'facebook'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Redirigir al frontend con el token
      res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}&provider=facebook`);

    } catch (error) {
      console.error('Error en Facebook callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  }

  /**
   * Callback de Google OAuth - Maneja la respuesta después de autenticación
   * Passport.js ya procesó el perfil, este método genera JWT y redirige
   */
  async googleCallback(req, res) {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
      }

      // Generar JWT token
      const token = jwt.sign(
        { 
          id: req.user.id, 
          email: req.user.email, 
          rol: req.user.rol,
          oauth_provider: 'google'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Redirigir al frontend con el token
      res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}&provider=google`);

    } catch (error) {
      console.error('Error en Google callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  }

  /**
   * Autenticación con Facebook usando Access Token desde frontend
   * Usado cuando el frontend ya obtuvo el token (Facebook SDK)
   */
  async loginWithFacebookToken(req, res) {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({ 
          success: false, 
          message: 'Access token requerido' 
        });
      }

      // Validar y obtener perfil de Facebook
      const profile = await facebookAuthService.validateAndGetProfile(accessToken);

      if (!profile.email) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se pudo obtener el email de Facebook' 
        });
      }

      // Buscar o crear usuario
      const user = await this.findOrCreateOAuthUser({
        provider: 'facebook',
        providerId: profile.facebookId,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        accessToken: accessToken,
        refreshToken: null
      });

      // Generar JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          rol: user.rol,
          oauth_provider: 'facebook'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token: token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          oauth_provider: 'facebook',
          oauth_picture: user.oauth_picture
        }
      });

    } catch (error) {
      console.error('Error en loginWithFacebookToken:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al autenticar con Facebook',
        error: error.message
      });
    }
  }

  /**
   * Autenticación con Google usando ID Token desde frontend
   * Usado cuando el frontend ya obtuvo el token (Google Sign-In)
   */
  async loginWithGoogleToken(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID token requerido' 
        });
      }

      // Validar y obtener perfil de Google
      const profile = await googleAuthService.validateAndGetProfileFromIdToken(idToken);

      if (!profile.email) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se pudo obtener el email de Google' 
        });
      }

      // Buscar o crear usuario
      const user = await this.findOrCreateOAuthUser({
        provider: 'google',
        providerId: profile.googleId,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        accessToken: null, // ID Token no es access token
        refreshToken: null
      });

      // Generar JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          rol: user.rol,
          oauth_provider: 'google'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token: token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          oauth_provider: 'google',
          oauth_picture: user.oauth_picture
        }
      });

    } catch (error) {
      console.error('Error en loginWithGoogleToken:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al autenticar con Google',
        error: error.message
      });
    }
  }

  /**
   * Método auxiliar: Buscar o crear usuario OAuth
   * @param {Object} data - Datos del usuario OAuth
   * @returns {Promise<Object>} Usuario encontrado o creado
   */
  async findOrCreateOAuthUser(data) {
    const { provider, providerId, email, name, picture, accessToken, refreshToken } = data;

    // Buscar usuario existente por oauth_provider y oauth_id
    const [existingOAuthUser] = await db.query(
      'SELECT * FROM usuarios_admin WHERE oauth_provider = ? AND oauth_id = ?',
      [provider, providerId]
    );

    if (existingOAuthUser.length > 0) {
      // Usuario encontrado - actualizar tokens
      await db.query(
        `UPDATE usuarios_admin 
         SET oauth_access_token = ?, 
             oauth_refresh_token = ?, 
             oauth_updated_at = NOW(),
             oauth_picture = ?
         WHERE id = ?`,
        [accessToken, refreshToken, picture, existingOAuthUser[0].id]
      );

      const [updatedUser] = await db.query(
        'SELECT * FROM usuarios_admin WHERE id = ?',
        [existingOAuthUser[0].id]
      );
      
      return updatedUser[0];
    }

    // Verificar si existe usuario con el mismo email
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
        [provider, providerId, accessToken, refreshToken, picture, existingEmailUser[0].id]
      );

      const [updatedUser] = await db.query(
        'SELECT * FROM usuarios_admin WHERE id = ?',
        [existingEmailUser[0].id]
      );
      
      return updatedUser[0];
    }

    // Crear nuevo usuario
    const [result] = await db.query(
      `INSERT INTO usuarios_admin 
       (email, nombre, oauth_provider, oauth_id, oauth_access_token, oauth_refresh_token, oauth_picture, oauth_created_at, oauth_updated_at, rol, email_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)`,
      [email, name, provider, providerId, accessToken, refreshToken, picture, 'doctor', true]
    );

    const [newUser] = await db.query(
      'SELECT * FROM usuarios_admin WHERE id = ?',
      [result.insertId]
    );

    return newUser[0];
  }

  /**
   * Desvincular cuenta OAuth (convertir a cuenta tradicional)
   */
  async unlinkOAuthAccount(req, res) {
    try {
      const userId = req.user.id; // Desde middleware de autenticación

      // Verificar que el usuario tenga una contraseña establecida
      const [user] = await db.query(
        'SELECT password_hash FROM usuarios_admin WHERE id = ?',
        [userId]
      );

      if (!user[0] || !user[0].password_hash) {
        return res.status(400).json({
          success: false,
          message: 'Debes establecer una contraseña antes de desvincular la cuenta OAuth'
        });
      }

      // Desvincular OAuth
      await db.query(
        `UPDATE usuarios_admin 
         SET oauth_provider = NULL,
             oauth_id = NULL,
             oauth_access_token = NULL,
             oauth_refresh_token = NULL,
             oauth_picture = NULL,
             oauth_created_at = NULL,
             oauth_updated_at = NULL
         WHERE id = ?`,
        [userId]
      );

      res.json({
        success: true,
        message: 'Cuenta OAuth desvinculada correctamente'
      });

    } catch (error) {
      console.error('Error en unlinkOAuthAccount:', error);
      res.status(500).json({
        success: false,
        message: 'Error al desvincular cuenta OAuth'
      });
    }
  }
}

module.exports = new OAuthController();
