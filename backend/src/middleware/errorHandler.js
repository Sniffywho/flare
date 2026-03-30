const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Convert known Mongoose / JWT errors into ApiError instances so the
 * final error handler can treat them uniformly.
 */
const normalizeError = (err) => {
  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return new ApiError(400, messages.join('. '));
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return new ApiError(409, `${field} already exists`);
  }

  // JWT errors (shouldn't normally reach here, but just in case)
  if (err.name === 'JsonWebTokenError') return new ApiError(401, 'Invalid token');
  if (err.name === 'TokenExpiredError') return new ApiError(401, 'Token expired');

  return err; // Return unchanged if it's already an ApiError or unknown
};

/**
 * Global Express error handler.
 * Registered as the last middleware in app.js.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const normalized = normalizeError(err);

  const statusCode = normalized.statusCode || 500;
  const message = normalized.message || 'Internal Server Error';
  const isOperational = normalized.isOperational ?? false;

  // Log unexpected errors with full stack
  if (!isOperational || statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} → ${message}`, {
      stack: err.stack,
      body: req.body,
    });
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    // Include stack only in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
