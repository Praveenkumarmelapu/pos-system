import { Shop } from '../models/Shop.js';
import { User } from '../models/User.js';
import { Sale } from '../models/Sale.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function getAllShops(req, res, next) {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shopId: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [shops, total] = await Promise.all([
      Shop.find(query)
        .populate('ownerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Shop.countDocuments(query)
    ]);

    return sendSuccess(res, shops, 'Platform shops retrieved', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleShopStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return sendError(res, 'Invalid shop status', 400, 'INVALID_STATUS');
    }

    const shop = await Shop.findByIdAndUpdate(id, { status }, { new: true });
    if (!shop) {
      return sendError(res, 'Shop not found', 404, 'SHOP_NOT_FOUND');
    }

    return sendSuccess(res, shop, `Shop status updated to ${status}`);
  } catch (err) {
    next(err);
  }
}

export async function getPlatformMetrics(req, res, next) {
  try {
    const [
      totalShops,
      activeShops,
      suspendedShops,
      totalUsers,
      platformSales
    ] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ status: 'active' }),
      Shop.countDocuments({ status: 'suspended' }),
      User.countDocuments(),
      Sale.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalGrossVolume: { $sum: '$grandTotal' },
            totalTransactions: { $sum: 1 }
          }
        }
      ])
    ]);

    const salesMetrics = platformSales[0] || { totalGrossVolume: 0, totalTransactions: 0 };

    return sendSuccess(res, {
      shops: {
        total: totalShops,
        active: activeShops,
        suspended: suspendedShops
      },
      users: {
        total: totalUsers
      },
      sales: {
        totalVolume: salesMetrics.totalGrossVolume,
        totalTransactions: salesMetrics.totalTransactions
      }
    }, 'Platform metrics retrieved');
  } catch (err) {
    next(err);
  }
}
