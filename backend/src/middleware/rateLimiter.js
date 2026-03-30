const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

/**
 * Shared handler for all rate-limit violations.
 */
const rateLimitHandler = (_req, _res, next, options) => {
  next(new ApiError(429, options.message || 'Too many requests, please try again later'));
};

/**
 * Global limiter — applied to all /api/* routes.
 * 200 requests per IP per 15 minutes.
 */
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Too many requests from this IP, please try again in 15 minutes',
});

/**
 * Strict limiter — for auth endpoints (login, register, forgot-password).
 * 10 requests per IP per 15 minutes.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Too many auth attempts, please try again in 15 minutes',
});

/**
 * Message send limiter — prevents spam.
 * 60 messages per IP per minute.
 */
const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Sending messages too fast, please slow down',
});

module.exports = { globalRateLimiter, authRateLimiter, messageRateLimiter };
