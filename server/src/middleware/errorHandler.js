import { sendError } from '../utils/response.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return sendError(res, 'Validation error in request payload', 400, 'VALIDATION_ERROR', errorDetails);
  }

  // Handle Mongoose CastError / ValidationError
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    return sendError(res, err.message, 400, 'MONGOOSE_VALIDATION_ERROR', details);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return sendError(res, `Duplicate key error: A record with that ${field} already exists.`, 409, 'DUPLICATE_KEY_ERROR');
  }

  // Custom HTTP errors
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected internal error occurred.';

  return sendError(res, message, statusCode, errorCode);
}
