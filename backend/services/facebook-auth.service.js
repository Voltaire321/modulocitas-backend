/**
 * Servicio de Autenticación con Facebook OAuth
 * Maneja la validación de tokens y obtención de datos de perfil
 */

const axios = require('axios');

class FacebookAuthService {
  /**
   * Validar access token de Facebook
   * @param {string} accessToken - Token de acceso de Facebook
   * @returns {Promise<Object>} Datos del perfil validados
   */
  async validateAccessToken(accessToken) {
    try {
      // Verificar token utilizando el App Token (requiere APP_ID y APP_SECRET)
      const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
      
      const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
        params: {
          input_token: accessToken,
          access_token: appToken
        }
      });

      const data = debugResponse.data.data;

      if (!data.is_valid) {
        throw new Error('Token de Facebook inválido');
      }

      if (data.app_id !== process.env.FACEBOOK_APP_ID) {
        throw new Error('Token no pertenece a esta aplicación');
      }

      // Verificar que el token no haya expirado
      const expiresAt = data.expires_at;
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        throw new Error('Token de Facebook ha expirado');
      }

      return {
        valid: true,
        userId: data.user_id,
        expiresAt: expiresAt
      };

    } catch (error) {
      console.error('Error validando token de Facebook:', error.message);
      throw new Error('No se pudo validar el token de Facebook');
    }
  }

  /**
   * Obtener datos del perfil de usuario de Facebook
   * @param {string} accessToken - Token de acceso de Facebook
   * @returns {Promise<Object>} Datos del perfil del usuario
   */
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get('https://graph.facebook.com/me', {
        params: {
          fields: 'id,name,email,picture.type(large)',
          access_token: accessToken
        }
      });

      const profile = response.data;

      return {
        facebookId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture && profile.picture.data ? profile.picture.data.url : null
      };

    } catch (error) {
      console.error('Error obteniendo perfil de Facebook:', error.message);
      throw new Error('No se pudo obtener el perfil de Facebook');
    }
  }

  /**
   * Validar y obtener perfil completo
   * @param {string} accessToken - Token de acceso de Facebook
   * @returns {Promise<Object>} Perfil completo validado
   */
  async validateAndGetProfile(accessToken) {
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
        expiresAt: validation.expiresAt
      };

    } catch (error) {
      console.error('Error en validateAndGetProfile:', error.message);
      throw error;
    }
  }

  /**
   * Revocar token de acceso (logout)
   * @param {string} userId - ID del usuario en Facebook
   * @param {string} accessToken - Token de acceso a revocar
   * @returns {Promise<boolean>} True si se revocó correctamente
   */
  async revokeAccessToken(userId, accessToken) {
    try {
      await axios.delete(`https://graph.facebook.com/${userId}/permissions`, {
        params: {
          access_token: accessToken
        }
      });

      return true;

    } catch (error) {
      console.error('Error revocando token de Facebook:', error.message);
      return false;
    }
  }
}

module.exports = new FacebookAuthService();
