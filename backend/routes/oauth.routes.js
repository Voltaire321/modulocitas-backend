/**
 * Rutas de Autenticación OAuth
 * Endpoints para Facebook y Google OAuth 2.0
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport.config');
const oauthController = require('../controllers/oauth.controller');

/**
 * FACEBOOK OAUTH ROUTES
 */

// Iniciar autenticación con Facebook (redirige a Facebook)
router.get('/facebook', 
  passport.authenticate('facebook', { 
    scope: ['email', 'public_profile'],
    session: false 
  })
);

// Callback de Facebook después de autenticación
router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=facebook_auth_failed`,
    session: false 
  }),
  oauthController.facebookCallback
);

// Login con token de Facebook (desde frontend SDK)
router.post('/facebook/token', oauthController.loginWithFacebookToken);

/**
 * GOOGLE OAUTH ROUTES
 */

// Iniciar autenticación con Google (redirige a Google)
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

// Callback de Google después de autenticación
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    session: false 
  }),
  oauthController.googleCallback
);

// Login con ID token de Google (desde frontend SDK)
router.post('/google/token', oauthController.loginWithGoogleToken);

/**
 * OAUTH MANAGEMENT ROUTES
 */

// Desvincular cuenta OAuth (requiere autenticación)
// TODO: Implementar cuando se cree auth.middleware.js
// router.post('/unlink', authMiddleware.verifyToken, oauthController.unlinkOAuthAccount);

module.exports = router;
