import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';
import { Membership } from '../models/Membership.js';
import { AuditLog } from '../models/AuditLog.js';
import { config } from '../config/env.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { registerShopSchema, loginSchema } from '../validators/auth.validator.js';

function generateToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function generateShopId(shopName) {
  const prefix = shopName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'SHOP';
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}_${random}`;
}

export async function registerShop(req, res, next) {
  let user;
  let shop;
  let membership;
  try {
    const validated = registerShopSchema.parse(req.body);

    // Check if email already taken
    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      return sendError(res, 'An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await User.hashPassword(validated.password);

    // 1. Create User
    user = await User.create({
      name: validated.ownerName,
      email: validated.email,
      phone: validated.phone,
      passwordHash,
      isSuperAdmin: false
    });

    // 2. Create Unique Shop
    let shopId = generateShopId(validated.shopName);
    while (await Shop.findOne({ shopId })) {
      shopId = generateShopId(validated.shopName);
    }

    shop = await Shop.create({
      shopId,
      name: validated.shopName,
      ownerId: user._id,
      contactEmail: validated.email,
      contactPhone: validated.phone,
      businessCategory: validated.businessCategory,
      gstin: validated.gstin || null,
      address: validated.address || {},
      status: 'active',
      subscription: {
        planId: 'pro',
        status: 'active'
      },
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        timezone: 'Asia/Kolkata',
        enableGst: !!validated.gstin,
        receiptHeader: validated.shopName,
        receiptFooter: 'Thank you for shopping with us! Visit again.'
      }
    });

    // 3. Create Membership as Owner
    membership = await Membership.create({
      userId: user._id,
      shopId: shop.shopId,
      role: 'owner',
      permissions: ['pos:bill', 'inventory:manage', 'reports:view', 'settings:manage', 'employees:manage']
    });

    // 4. Audit Log
    await AuditLog.create({
      shopId: shop.shopId,
      userId: user._id,
      action: 'shop:registered',
      resourceType: 'shop',
      resourceId: shop._id.toString(),
      details: { shopName: shop.name, ownerEmail: user.email }
    }).catch(error => console.error('Could not record the shop registration audit event:', error.message));

    const token = generateToken(user._id);

    res.cookie('pos_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isSuperAdmin: user.isSuperAdmin
      },
      shop: {
        shopId: shop.shopId,
        name: shop.name,
        category: shop.businessCategory,
        gstin: shop.gstin,
        address: shop.address,
        contactPhone: shop.contactPhone,
        role: membership.role,
        status: shop.status,
        subscription: shop.subscription,
        supportEmail: config.supportEmail,
        settings: shop.settings
      }
    }, 'Shop registered successfully', 201);
  } catch (err) {
    // Clean up a partial registration so the owner can retry with the same email.
    if (!membership && user) {
      try {
        if (shop) await Shop.deleteOne({ _id: shop._id, ownerId: user._id });
        await User.deleteOne({ _id: user._id });
      } catch (cleanupError) {
        console.error('Could not clean up incomplete shop registration:', cleanupError.message);
      }
    }
    next(err);
  }
}

async function resolveShop(userId, preferredShopId) {
  const memberships = await Membership.find({ userId, status: 'active' }).sort({ createdAt: 1 });
  const shops = await Shop.find({ shopId: { $in: memberships.map(item => item.shopId) } });
  const matches = memberships.flatMap(membership => {
    const shop = shops.find(item => item.shopId === membership.shopId);
    return shop ? [{ shop, membership }] : [];
  });
  const match = matches.find(({ shop }) => shop.shopId === preferredShopId)
    ?? matches.find(({ shop }) => shop.status === 'active')
    ?? matches[0];
  if (!match) return null;
  const { shop, membership } = match;
  return {
    shopId: shop.shopId,
    name: shop.name,
    category: shop.businessCategory,
    gstin: shop.gstin,
    address: shop.address,
    contactPhone: shop.contactPhone,
    role: membership.role,
    permissions: membership.permissions,
    settings: shop.settings,
    status: shop.status,
    subscription: shop.subscription,
    supportEmail: config.supportEmail
  };
}

export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'active') {
      return sendError(res, 'This user account is suspended.', 403, 'USER_SUSPENDED');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);

    const activeShop = await resolveShop(user._id);

    res.cookie('pos_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isSuperAdmin: user.isSuperAdmin
      },
      shop: activeShop
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = req.user;
    const activeShop = await resolveShop(user._id, req.get('x-shop-id'));

    return sendSuccess(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isSuperAdmin: user.isSuperAdmin
      },
      shop: activeShop
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  res.clearCookie('pos_token');
  return sendSuccess(res, null, 'Logged out successfully');
}
