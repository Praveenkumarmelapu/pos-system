import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';
import { MasterProduct } from '../models/MasterProduct.js';

describe('Store access and barcode onboarding', () => {
  const tag = Date.now();
  const owner = {
    ownerName: 'Test Owner', shopName: 'Test Retail Shop', email: `owner-${tag}@example.test`,
    phone: '9849011200', password: 'Testing123'
  };
  const api = request(app);
  let adminToken;
  let ownerToken;
  let shopId;
  let shopObjectId;

  beforeAll(async () => {
    await mongoose.connect(config.mongoUri);
    const admin = { email: `admin-${tag}@example.test`, password: 'AdminTesting123' };
    await User.create({ name: 'Test Admin', email: admin.email, passwordHash: await User.hashPassword(admin.password), isSuperAdmin: true });
    const login = await api.post('/api/v1/auth/login').send(admin).expect(200);
    adminToken = login.body.data.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('registers the owner and exposes the active store through the session API', async () => {
    const result = await api.post('/api/v1/auth/register-shop').send(owner).expect(201);
    ownerToken = result.body.data.token;
    shopId = result.body.data.shop.shopId;
    shopObjectId = (await Shop.findOne({ shopId })).id;
    const me = await api.get('/api/v1/auth/me').auth(ownerToken, { type: 'bearer' }).expect(200);
    expect(me.body.data.shop).toMatchObject({ shopId, status: 'active', role: 'owner' });
    await api.post('/api/v1/auth/register-shop').send(owner).expect(409);
  });

  it('blocks shop operations on suspension, exposes the status at login, and restores access', async () => {
    const adminStatus = status => api.patch(`/api/v1/admin/shops/${shopObjectId}/status`).auth(adminToken, { type: 'bearer' }).send({ status });
    await adminStatus('suspended').expect(200);
    const denied = await api.get('/api/v1/products').auth(ownerToken, { type: 'bearer' }).expect(403);
    expect(denied.body.error.code).toBe('SHOP_SUSPENDED');
    const login = await api.post('/api/v1/auth/login').send({ email: owner.email, password: owner.password }).expect(200);
    expect(login.body.data.shop.status).toBe('suspended');
    await adminStatus('active').expect(200);
    await api.get('/api/v1/products').auth(ownerToken, { type: 'bearer' }).expect(200);
  });

  it('keeps catalog suggestions price-free, reuses shop prices, and preserves unknown barcodes', async () => {
    const barcode = '748528227955';
    const lookup = code => api.get(`/api/v1/barcodes/lookup/${code}`).auth(ownerToken, { type: 'bearer' });
    await MasterProduct.updateOne({ barcode }, { name: 'Catalog Soap', mrp: 4250 }, { upsert: true });
    const catalog = await lookup(`0${barcode}`).expect(200);
    expect(catalog.body.data.product).toMatchObject({ name: 'Catalog Soap', mrp: null, sellingPrice: null, purchasePrice: null, priceDetected: false });
    const builtIn = await lookup('8901058852234').expect(200);
    expect(builtIn.body.data.product).toMatchObject({ name: 'Maggi 2-Minute Masala Noodles 70g', mrp: null, sellingPrice: null, purchasePrice: null, priceDetected: false });
    await api.post('/api/v1/products').auth(ownerToken, { type: 'bearer' })
      .send({ barcode, name: 'Shop Soap', sellingPrice: 40.50, purchasePrice: 20 }).expect(201);
    const stored = await lookup(`0${barcode}`).expect(200);
    expect(stored.body.data.product).toMatchObject({ name: 'Shop Soap', sellingPrice: 4050 });
    const unknown = await lookup('LOCAL-UNKNOWN-001').expect(200);
    expect(unknown.body.data).toMatchObject({ found: false, product: { barcode: 'LOCAL-UNKNOWN-001' } });
  });

  it('persists shop settings and creates staff with owner-only management permissions', async () => {
    const auth = { type: 'bearer' };
    await api.patch('/api/v1/shop/settings').auth(ownerToken, auth)
      .send({ name: 'Updated Shop', gstin: '', receiptFooter: 'Visit again', lowStockThreshold: 0 }).expect(200);
    const me = await api.get('/api/v1/auth/me').auth(ownerToken, auth).expect(200);
    expect(me.body.data.shop).toMatchObject({ name: 'Updated Shop', settings: { lowStockThresholdDefault: 0, receiptFooter: 'Visit again' } });
    const staff = { name: 'Test Cashier', email: `cashier-${tag}@example.test`, password: 'Testing123', role: 'cashier' };
    await api.post('/api/v1/shop/staff').auth(ownerToken, auth).send(staff).expect(201);
    const list = await api.get('/api/v1/shop/staff').auth(ownerToken, auth).expect(200);
    expect(list.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ email: staff.email, role: 'cashier' })]));
    const login = await api.post('/api/v1/auth/login').send({ email: staff.email, password: staff.password }).expect(200);
    expect(login.body.data.shop).toMatchObject({ shopId, role: 'cashier' });
    await api.get('/api/v1/shop/staff').auth(login.body.data.token, auth).expect(403);
  });
});
