import { sendError } from '../utils/response.js';
import { Membership } from '../models/Membership.js';
import { Shop } from '../models/Shop.js';

/**
 * Tenant Context Middleware
 * Enforces logical tenant isolation. Derives active shop from verified membership
 * or explicit header verified against user's permitted memberships.
 * NEVER trusts an unverified shopId from client params.
 */
export async function tenantContext(req, res, next) {
  try {
    if (!req.user) {
      return sendError(res, 'User identity not established before tenant context.', 500, 'AUTH_CONTEXT_MISSING');
    }

    // Super Admin platform access bypasses tenant restriction for admin endpoints
    if (req.user.isSuperAdmin && req.headers['x-admin-mode'] === 'true') {
      req.tenant = { isSuperAdmin: true, shopId: null, role: 'superadmin' };
      return next();
    }

    // Determine target shopId: from header or default membership
    const requestedShopId = req.headers['x-shop-id'];

    const query = {
      userId: req.user._id,
      status: 'active'
    };

    if (requestedShopId) {
      query.shopId = requestedShopId;
    }

    // Find active membership
    const membership = await Membership.findOne(query);

    if (!membership) {
      return sendError(res, 'No active shop membership found for this user.', 403, 'FORBIDDEN_TENANT_ACCESS');
    }

    // Verify Shop itself is active
    const shop = await Shop.findOne({ shopId: membership.shopId });
    if (shop?.status === 'suspended') {
      return sendError(res, 'Your store has been suspended. Please contact the support team.', 403, 'SHOP_SUSPENDED');
    }
    if (shop?.status !== 'active') {
      return sendError(res, 'The selected shop is inactive or suspended.', 403, 'SHOP_INACTIVE');
    }

    req.tenant = {
      shopId: shop.shopId,
      shopObjectId: shop._id,
      shopName: shop.name,
      role: membership.role,
      permissions: membership.permissions || [],
      settings: shop.settings
    };

    next();
  } catch (err) {
    return sendError(res, 'Failed to resolve tenant context: ' + err.message, 500, 'TENANT_RESOLUTION_ERROR');
  }
}
