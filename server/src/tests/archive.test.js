import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { formatInvoiceNumber } from '../controllers/sale.controller.js';

let app;
let config;
let User;
let Shop;
let Membership;
let Sale;
let CustomerLedgerEntry;
let owner;
let cashier;
let tokenOwner;
let tokenCashier;
const shopId = 'ARCHIVE_TEST';
const secondShopId = 'OTHER_TEST';
const recentDate = new Date();
const cutoffDate = new Date(Date.UTC(recentDate.getUTCFullYear(), recentDate.getUTCMonth(), 1) - 24 * 60 * 60 * 1000);
const cutoffIso = cutoffDate.toISOString().slice(0, 10);
const archivedDate = new Date(Date.UTC(recentDate.getUTCFullYear(), recentDate.getUTCMonth() - 2, 15));

function makeSale(shop, index, overrides = {}) {
  return {
    shopId: shop,
    invoiceNumber: `INV-TEST-${shop}-${String(index).padStart(5, '0')}`,
    idempotencyKey: `idempotency-${shop}-${index}`,
    cashierId: owner._id,
    cashierName: 'Archive Test Owner',
    customerId: null,
    customerName: 'Walk-in Customer',
    items: [{
      productId: new mongoose.Types.ObjectId(), barcode: '123456', name: 'Test Item',
      quantity: 1, unitPrice: 1000, mrp: 1000, purchasePrice: 500, discountAmount: 0,
      taxRate: 0, taxAmount: 0, lineTotal: 1000
    }],
    subtotal: 1000, totalDiscount: 0, totalTax: 0, grandTotal: 1000,
    paymentMethod: 'cash', paidAmount: 1000, creditAmount: 0, isKhata: false,
    paymentBreakdown: { cash: 1000, upi: 0, card: 0, credit: 0 },
    status: 'completed', saleDate: archivedDate,
    ...overrides
  };
}

describe('owner-only verified old bill export and clearing', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-jwt-secret';
    const imported = await import('../app.js');
    app = imported.default;
    ({ config } = await import('../config/env.js'));
    ({ User } = await import('../models/User.js'));
    ({ Shop } = await import('../models/Shop.js'));
    ({ Membership } = await import('../models/Membership.js'));
    ({ Sale } = await import('../models/Sale.js'));
    ({ CustomerLedgerEntry } = await import('../models/CustomerLedgerEntry.js'));
    await mongoose.connect(config.mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    for (const model of mongoose.models ? Object.values(mongoose.models) : []) await model.deleteMany({});
    owner = await User.create({ name: 'Archive Owner', email: 'archive-owner@test.local', phone: '111', passwordHash: 'x' });
    cashier = await User.create({ name: 'Archive Cashier', email: 'archive-cashier@test.local', phone: '222', passwordHash: 'x' });
    await Shop.create({ shopId, name: 'Archive Test Shop', ownerId: owner._id, contactEmail: owner.email, contactPhone: owner.phone, businessCategory: 'Grocery' });
    await Shop.create({ shopId: secondShopId, name: 'Other Shop', ownerId: owner._id, contactEmail: owner.email, contactPhone: owner.phone, businessCategory: 'Grocery' });
    await Membership.create([
      { userId: owner._id, shopId, role: 'owner', permissions: [] },
      { userId: cashier._id, shopId, role: 'cashier', permissions: [] }
    ]);
    tokenOwner = jwt.sign({ userId: owner._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    tokenCashier = jwt.sign({ userId: cashier._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  it('keeps invoice numbering month-based after older records are removed', () => {
    const invoiceDate = new Date('2026-11-24T10:00:00.000Z');
    expect(formatInvoiceNumber(0, invoiceDate)).toBe('INV-202611-00001');
    expect(formatInvoiceNumber(4, invoiceDate)).toBe('INV-202611-00005');
  });

  it('denies anonymous and cashier access, rejects current-month and invalid dates', async () => {
    const endpoint = `/api/v1/sales/archive/preview?beforeDate=${cutoffIso}`;
    expect((await request(app).get(endpoint).set('x-shop-id', shopId)).status).toBe(401);
    expect((await request(app).get(endpoint).set('Authorization', `Bearer ${tokenCashier}`).set('x-shop-id', shopId)).status).toBe(403);
    expect((await request(app).get(`/api/v1/sales/archive/preview?beforeDate=${recentDate.toISOString().slice(0, 10)}`).set('Authorization', `Bearer ${tokenOwner}`).set('x-shop-id', shopId)).status).toBe(400);
    expect((await request(app).get('/api/v1/sales/archive/preview?beforeDate=2026-02-30').set('Authorization', `Bearer ${tokenOwner}`).set('x-shop-id', shopId)).status).toBe(400);
  });

  it('exports all bills in pages, verifies the snapshot, clears only eligible same-shop bills', async () => {
    const eligible = Array.from({ length: 305 }, (_, i) => makeSale(shopId, i + 1));
    const customerProtected = makeSale(shopId, 400, { customerId: new mongoose.Types.ObjectId(), customerName: 'Customer history', creditAmount: 0 });
    const returnProtected = makeSale(shopId, 401, { refundTotal: 100, status: 'partially_returned', returns: [{ productId: new mongoose.Types.ObjectId(), barcode: '123', name: 'returned', quantity: 1, unitPrice: 100, refundAmount: 100, returnedBy: owner._id, returnedByName: owner.name }] });
    const currentMonthSale = makeSale(shopId, 402, { invoiceNumber: `INV-${recentDate.getFullYear()}${String(recentDate.getMonth() + 1).padStart(2, '0')}-00007`, saleDate: new Date(), idempotencyKey: 'current-month-kept' });
    await Sale.create(makeSale(shopId, 999, { invoiceNumber: 'INV-202610-00099', saleDate: new Date(), idempotencyKey: 'prior-month-kept' }));
    await Sale.insertMany([...eligible, customerProtected, returnProtected, currentMonthSale, makeSale(secondShopId, 1)]);

    const preview = await request(app).get(`/api/v1/sales/archive/preview?beforeDate=${cutoffIso}`).set('Authorization', `Bearer ${tokenOwner}`).set('x-shop-id', shopId);
    expect(preview.status).toBe(200);
    expect(preview.body.data.totalAll).toBe(309);
    expect(preview.body.data.total).toBe(307);
    expect(preview.body.data.eligible).toBe(305);
    expect(preview.body.data.protected).toBe(2);

    let token;
    let after;
    const exported = [];
    do {
      const response = await request(app).post('/api/v1/sales/archive/export').set('Authorization', `Bearer ${tokenOwner}`).set('x-shop-id', shopId).send(after ? { exportToken: token, after } : { beforeDate: cutoffIso });
      expect(response.status).toBe(200);
      token = response.body.data.exportToken;
      exported.push(...response.body.data.records);
      after = response.body.data.after;
      if (!response.body.data.hasMore) break;
      expect(after).toBeTruthy();
    } while (true);
    expect(exported).toHaveLength(309);
    expect(new Set(exported.map((sale) => String(sale._id))).size).toBe(309);
    expect(exported.every((sale) => sale.shopId === shopId)).toBe(true);
    expect(exported[0].items[0].name).toBe('Test Item');

    const staleResponse = await request(app).post('/api/v1/sales/archive/clear').set('Authorization', `Bearer ${tokenOwner}`).set('x-shop-id', shopId).send({ exportToken: token });
    expect(staleResponse.status).toBe(200);
    expect(staleResponse.body.data.deleted).toBe(305);
    expect(staleResponse.body.data.protected).toBe(2);
    expect(await Sale.countDocuments({ shopId })).toBe(4);
    expect(await Sale.countDocuments({ shopId: secondShopId })).toBe(1);
    expect(await Sale.countDocuments({ invoiceNumber: `INV-TEST-${shopId}-00400` })).toBe(1);
    expect(await Sale.countDocuments({ invoiceNumber: `INV-TEST-${shopId}-00401` })).toBe(1);
    expect(await Sale.countDocuments({ invoiceNumber: currentMonthSale.invoiceNumber })).toBe(1);
    expect(await Sale.countDocuments({ invoiceNumber: 'INV-202610-00099' })).toBe(1);
  });

  it('refuses to clear when a new lower-ID bill lands inside the snapshot boundary', async () => {
    await Sale.create(makeSale(shopId, 1, { createdAt: new Date(Date.now() + 10000) }));
    const response = await request(app).post('/api/v1/sales/archive/export').set('Authorization', `Bearer ${tokenOwner}`).set('x-shop-id', shopId).send({ beforeDate: cutoffIso });
    expect(response.status).toBe(200);
    await Sale.create(makeSale(shopId, 2, {
      _id: new mongoose.Types.ObjectId('000000000000000000000001'),
      createdAt: new Date(Date.now() - 10000),
      idempotencyKey: 'inserted-after-snapshot'
    }));
    const clear = await request(app).post('/api/v1/sales/archive/clear').set('Authorization', `Bearer ${tokenOwner}`).set('x-shop-id', shopId).send({ exportToken: response.body.data.exportToken });
    expect(clear.status).toBe(409);
    expect(clear.body.error.code).toBe('ARCHIVE_EXPORT_STALE');
    expect(await Sale.countDocuments({ shopId })).toBe(2);
  });

  it('refuses clearing when any bill changes after export', async () => {
    const [sale] = await Sale.create([makeSale(shopId, 1)]);
    const response = await request(app).post('/api/v1/sales/archive/export').set('Authorization', `Bearer ${tokenOwner}`).set('x-shop-id', shopId).send({ beforeDate: cutoffIso });
    expect(response.status).toBe(200);
    await Sale.updateOne({ _id: sale._id }, { $set: { status: 'returned', refundTotal: 100 } });
    const clear = await request(app).post('/api/v1/sales/archive/clear').set('Authorization', `Bearer ${tokenOwner}`).set('x-shop-id', shopId).send({ exportToken: response.body.data.exportToken });
    expect(clear.status).toBe(409);
    expect(clear.body.error.code).toBe('ARCHIVE_EXPORT_STALE');
    expect(await Sale.countDocuments({ _id: sale._id })).toBe(1);
  });
});
