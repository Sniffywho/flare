const router = require('express').Router();
const { body } = require('express-validator');
const passport = require('passport');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authRateLimiter } = require('../middleware/rateLimiter');
require('../config/passport');

// ── Validation chains ──────────────────────────────────────────────────────────

const registerValidators = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers, and underscores'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

const loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Routes ─────────────────────────────────────────────────────────────────────

router.post('/register', authRateLimiter, registerValidators, validate, authController.register);
router.post('/login', authRateLimiter, loginValidators, validate, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.patch(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  validate,
  authController.changePassword
);

// ── OAuth Routes ───────────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  authController.oauthCallback
);

router.get('/apple', passport.authenticate('apple', { scope: ['name', 'email'] }));

router.get(
  '/apple/callback',
  passport.authenticate('apple', { session: false }),
  authController.oauthCallback
);

module.exports = router;
