const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Reads the results of express-validator chains and throws a 400 ApiError
 * if any validation rule failed. Place this after your validation chains
 * in a route definition:
 *
 *   router.post('/register', [...validators], validate, authController.register);
 */
const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('. ');
    return next(new ApiError(400, messages));
  }
  next();
};

module.exports = validate;
