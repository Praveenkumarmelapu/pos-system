import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { sendError } from '../utils/response.js';
import { User } from '../models/User.js';
import { cacheGet, cacheSet } from '../utils/cache.js';

export async function authGuard(req, res, next) {
  try {
    let token = null;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.pos_token) {
      token = req.cookies.pos_token;
    }

    if (!token) {
      return sendError(res, 'Authentication required. No token provided.', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Cache the user record briefly on the warm serverless instance to skip a
    // database round trip on every request. Token expiry is still verified above.
    const cacheKey = `auth:${token}`;
    let user = cacheGet(cacheKey);
    if (!user) {
      user = await User.findById(decoded.userId).select('-passwordHash').lean();
      if (user) cacheSet(cacheKey, user, 60000);
    }

    if (!user || user.status !== 'active') {
      return sendError(res, 'User account not found or suspended.', 401, 'USER_INACTIVE');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Session token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }
    return sendError(res, 'Invalid authentication token.', 401, 'INVALID_TOKEN');
  }
}
