import { sendError } from '../utils/response.js';
import { Membership } from '../models/Membership.js';
import { Shop } from '../models/Shop.js';
import { cacheGet, cacheSet } from '../utils/cache.js';

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

    // Brief per-instance cache: membership + shop rarely change and this runs on
    // every API call, so caching cuts two database round trips per request.
    const tenantCacheKey = `tenant:${req.user._id}:${requestedShopId || 'default'}`;
    const cachedTenant = cacheGet(tenantCacheKey);
    if (cachedTenant) {
      if (cachedTenant.error) {
        return sendError(res, cachedTenant.error.message, cachedTenant.error.status, cachedTenant.error.code);
      }
      req.tenant = cachedTenant.tenant;
      return next();
    }

    const query = {
      userId: req.user._id,
      status: 'active'
    };

    if (requestedShopId) {
      query.shopId = requestedShopId;
    }

    // Find active membership
    const membership = await Membership.findOne(query).lean();

    if (!membership) {
      return sendError(res, 'No active shop membership found for this user.', 403, 'FORBIDDEN_TENANT_ACCESS');
    }

    // Verify Shop itself is active
    const shop = await Shop.findOne({ shopId: membership.shopId }).lean();
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

    cacheSet(tenantCacheKey, { tenant: req.tenant }, 60000);

    next();
  } catch (err) {
    return sendError(res, 'Failed to resolve tenant context: ' + err.message, 500, 'TENANT_RESOLUTION_ERROR');
  }
}
