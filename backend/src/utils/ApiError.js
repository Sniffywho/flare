/**
 * Custom error class that carries an HTTP status code.
 * Controllers throw ApiError; the global error handler catches it and
 * sends the appropriate JSON response.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode  - HTTP status code (4xx / 5xx)
   * @param {string} message     - Human-readable error message
   * @param {boolean} isOperational - true = known, expected error; false = programmer error
   */
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = statusCode >= 500 ? 'error' : 'fail';

    // Maintain proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Convenience factories ──────────────────────────────────────────────────

  static badRequest(msg = 'Bad request') {
    return new ApiError(400, msg);
  }

  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg);
  }

  static tooManyRequests(msg = 'Too many requests') {
    return new ApiError(429, msg);
  }

  static internal(msg = 'Internal server error') {
    return new ApiError(500, msg, false);
  }
}

module.exports = ApiError;
