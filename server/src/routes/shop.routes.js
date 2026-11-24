import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/authGuard.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireRole } from '../middleware/roleGuard.js';
import { Shop } from '../models/Shop.js';
import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';
import { sendError, sendSuccess } from '../utils/response.js';

const router = Router();
router.use(authGuard, tenantContext, requireRole('owner'));

router.patch('/settings', async (req, res, next) => {
  try {
    const { name, gstin, receiptFooter, lowStockThreshold } = z.object({
      name: z.string().trim().min(2).max(120),
      gstin: z.string().trim().max(15),
      receiptFooter: z.string().trim().max(180),
      lowStockThreshold: z.number().int().nonnegative()
    }).parse(req.body);
    const shop = await Shop.findOneAndUpdate(
      { shopId: req.tenant.shopId, status: 'active' },
      { $set: {
        name, gstin: gstin.toUpperCase() || null,
        'settings.receiptFooter': receiptFooter,
        'settings.enableGst': Boolean(gstin),
        'settings.lowStockThresholdDefault': lowStockThreshold
      } },
      { new: true, runValidators: true }
    );
    if (!shop) return sendError(res, 'The store is unavailable.', 403, 'SHOP_INACTIVE');
    return sendSuccess(res, { name: shop.name, gstin: shop.gstin, settings: shop.settings });
  } catch (error) {
    next(error);
  }
});

router.get('/staff', async (req, res, next) => {
  try {
    const memberships = await Membership.find({ shopId: req.tenant.shopId }).populate('userId', 'name email');
    return sendSuccess(res, memberships.filter(item => item.userId).map(item => ({
      id: item._id, name: item.userId.name, email: item.userId.email,
      role: item.role, status: item.status, permissions: item.permissions
    })));
  } catch (error) {
    next(error);
  }
});

router.post('/staff', async (req, res, next) => {
  let user;
  try {
    const { name, email, password, role } = z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(8).max(72),
      role: z.enum(['cashier', 'manager'])
    }).parse(req.body);
    if (await User.exists({ email })) {
      return sendError(res, 'This email already belongs to an account. Use a new staff email.', 409, 'EMAIL_EXISTS');
    }
    user = await User.create({ name, email, passwordHash: await User.hashPassword(password) });
    const permissions = role === 'manager' ? ['pos:bill', 'inventory:manage', 'reports:view'] : ['pos:bill'];
    const membership = await Membership.create({ shopId: req.tenant.shopId, userId: user._id, role, permissions });
    return sendSuccess(res, { id: membership._id, name, email, role, permissions, status: membership.status }, 'Staff account created', 201);
  } catch (error) {
    if (user) await User.deleteOne({ _id: user._id }).catch(cleanupError => {
      console.error('Could not clean up an incomplete staff account:', cleanupError.message);
    });
    next(error);
  }
});

export default router;
