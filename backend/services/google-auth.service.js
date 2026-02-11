/**
 * Servicio de Autenticación con Google OAuth
 * Maneja la validación de tokens y obtención de datos de perfil
 */

const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /**
   * Validar ID Token de Google (usado en autenticación desde frontend)
   * @param {string} idToken - Token ID de Google
   * @returns {Promise<Object>} Datos del perfil validados
   */
  async validateIdToken(idToken) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      
      return {
        valid: true,
        googleId: payload['sub'],
        email: payload['email'],
        emailVerified: payload['email_verified'],
        name: payload['name'],
        picture: payload['picture'],
        givenName: payload['given_name'],
        familyName: payload['family_name']
      };

    } catch (error) {
      console.error('Error validando ID token de Google:', error.message);
      throw new Error('Token de Google inválido');
    }
  }

  /**
   * Validar Access Token de Google
   * @param {string} accessToken - Token de acceso de Google
   * @returns {Promise<Object>} Información del token validado
   */
  async validateAccessToken(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/tokeninfo', {
        params: {
          access_token: accessToken
        }
      });

      const data = response.data;

      // Verificar que el token pertenece a nuestra aplicación
      if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Token no pertenece a esta aplicación');
      }

      // Verificar que el token no haya expirado
      const expiresIn = parseInt(data.expires_in);
      if (expiresIn <= 0) {
        throw new Error('Token de Google ha expirado');
      }

      return {
        valid: true,
        userId: data.sub,
        email: data.email,
        emailVerified: data.email_verified === 'true',
        expiresIn: expiresIn
      };

    } catch (error) {
      console.error('Error validando access token de Google:', error.message);
      throw new Error('No se pudo validar el token de Google');
    }
  }

  /**
   * Obtener datos del perfil de usuario usando Access Token
   * @param {string} accessToken - Token de acceso de Google
   * @returns {Promise<Object>} Datos del perfil del usuario
   */
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const profile = response.data;

      return {
        googleId: profile.id,
        email: profile.email,
        emailVerified: profile.verified_email,
        name: profile.name,
        givenName: profile.given_name,
        familyName: profile.family_name,
        picture: profile.picture
      };

    } catch (error) {
      console.error('Error obteniendo perfil de Google:', error.message);
      throw new Error('No se pudo obtener el perfil de Google');
    }
  }

  /**
   * Validar y obtener perfil completo desde ID Token
   * @param {string} idToken - Token ID de Google
   * @returns {Promise<Object>} Perfil completo validado
   */
  async validateAndGetProfileFromIdToken(idToken) {
    try {
      const profile = await this.validateIdToken(idToken);
      
      if (!profile.valid) {
        throw new Error('Token inválido');
      }

      return profile;

    } catch (error) {
      console.error('Error en validateAndGetProfileFromIdToken:', error.message);
      throw error;
    }
  }

  /**
   * Validar y obtener perfil completo desde Access Token
   * @param {string} accessToken - Token de acceso de Google
   * @returns {Promise<Object>} Perfil completo validado
   */
  async validateAndGetProfileFromAccessToken(accessToken) {
    try {
      // Validar token
      const validation = await this.validateAccessToken(accessToken);
      
      if (!validation.valid) {
        throw new Error('Token inválido');
      }

      // Obtener perfil
      const profile = await this.getUserProfile(accessToken);

      return {
        ...profile,
        tokenValid: true,
        expiresIn: validation.expiresIn
      };

    } catch (error) {
      console.error('Error en validateAndGetProfileFromAccessToken:', error.message);
      throw error;
    }
  }

  /**
   * Revocar token de acceso (logout)
   * @param {string} accessToken - Token de acceso a revocar
   * @returns {Promise<boolean>} True si se revocó correctamente
   */
  async revokeAccessToken(accessToken) {
    try {
      await axios.post('https://oauth2.googleapis.com/revoke', null, {
        params: {
          token: accessToken
        }
      });

      return true;

    } catch (error) {
      console.error('Error revocando token de Google:', error.message);
      return false;
    }
  }

  /**
   * Refrescar Access Token usando Refresh Token
   * @param {string} refreshToken - Refresh token de Google
   * @returns {Promise<Object>} Nuevo access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      };

    } catch (error) {
      console.error('Error refrescando token de Google:', error.message);
      throw new Error('No se pudo refrescar el token de Google');
    }
  }
}

module.exports = new GoogleAuthService();
