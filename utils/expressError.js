/**
 * CraftConnect — Custom HTTP Error class
 *
 * Usage:
 *   const ExpressError = require('../utils/expressError');
 *   throw new ExpressError(404, 'Resource not found');
 *
 * The Express global error handler in app.js reads `err.status` (or `err.statusCode`)
 * and `err.message` to compose the response.
 */
class ExpressError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ExpressError';
    this.statusCode = statusCode;
    this.status = statusCode; // alias for frameworks that read .status
    this.message = message;
  }
}

module.exports = ExpressError;
