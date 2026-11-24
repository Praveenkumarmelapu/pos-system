import { sendError } from '../utils/response.js';

/**
 * Role-Based Access Control Guard
 * @param  {...string} allowedRoles ('owner', 'manager', 'cashier', 'superadmin')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401, 'UNAUTHORIZED');
    }

    if (req.user.isSuperAdmin && allowedRoles.includes('superadmin')) {
      return next();
    }

    if (!req.tenant || !req.tenant.role) {
      return sendError(res, 'No tenant role context established.', 403, 'NO_ROLE_ASSIGNED');
    }

    if (allowedRoles.includes(req.tenant.role)) {
      return next();
    }

    return sendError(res, `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`, 403, 'FORBIDDEN_ROLE');
  };
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.user.isSuperAdmin) {
    return sendError(res, 'Super Admin privileges required.', 403, 'FORBIDDEN_SUPERADMIN');
  }
  next();
}
