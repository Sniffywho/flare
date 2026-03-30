/**
 * General-purpose helper utilities.
 */

/**
 * Wrap an async route handler so Express catches rejected promises automatically.
 * Eliminates boilerplate try/catch in every controller.
 *
 * @param {Function} fn - async (req, res, next) => {}
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Build a standardised success response envelope.
 */
const successResponse = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Sanitise user object for client consumption — strips sensitive fields.
 */
const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

/**
 * Paginate a Mongoose query.
 *
 * @param {Model}  Model       - Mongoose model
 * @param {Object} filter      - Query filter
 * @param {Object} options     - { page, limit, sort, populate }
 * @returns {{ docs, total, page, pages, hasNext, hasPrev }}
 */
const paginate = async (Model, filter = {}, options = {}) => {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  let query = Model.find(filter).sort(sort).skip(skip).limit(limit);

  if (options.populate) {
    const populations = Array.isArray(options.populate)
      ? options.populate
      : [options.populate];
    populations.forEach((p) => { query = query.populate(p); });
  }

  const [docs, total] = await Promise.all([query, Model.countDocuments(filter)]);

  return {
    docs,
    total,
    page,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
};

/**
 * Simple check: is the given string a valid MongoDB ObjectId format?
 */
const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

module.exports = { catchAsync, successResponse, sanitizeUser, paginate, isValidObjectId };
