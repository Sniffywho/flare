const { verifyAccessToken } = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

/**
 * Protect routes — verifies the JWT access token sent in the
 * Authorization: Bearer <token> header.
 *
 * Attaches the authenticated user to req.user.
 */
const protect = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('No token provided'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Fetch user (exclude password) and confirm they still exist
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      return next(ApiError.unauthorized('User no longer exists'));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    next(err);
  }
};

/**
 * Restrict access to users with specific roles.
 * Must be used after `protect`.
 *
 * @param {...string} roles - Allowed roles, e.g. 'admin'
 */
const restrictTo = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};

/**
 * Optional auth — attaches req.user if a valid token is provided,
 * but does NOT block unauthenticated requests.
 */
const optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      req.user = await User.findById(decoded.id).select('-password -refreshToken');
    }
  } catch (_err) {
    // Ignore — request continues without a user
  }
  next();
};

module.exports = { protect, restrictTo, optionalAuth };
