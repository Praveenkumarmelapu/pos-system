import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { config } from '../config/env.js';

describe('Retail POS SaaS Multi-Tenant Isolation & Core API Integration Tests', () => {
  let tokenShop1;
  let tokenShop2;
  let shop1Id;
  let shop2Id;
  let shop1ProductId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 30000);

  it('1. Register Shop 1 (Kirana Store)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-shop')
      .send({
        shopName: 'Test Kirana 1',
        ownerName: 'Owner One',
        email: `owner1_${Date.now()}@test.local`,
        phone: '9849010001',
        password: 'Password123!',
        businessCategory: 'Kirana & Grocery',
        gstin: '36TEST10001A1Z1'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.shop.shopId).toBeDefined();

    tokenShop1 = res.body.data.token;
    shop1Id = res.body.data.shop.shopId;
  });

  it('2. Register Shop 2 (Supermarket)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-shop')
      .send({
        shopName: 'Test Supermarket 2',
        ownerName: 'Owner Two',
        email: `owner2_${Date.now()}@test.local`,
        phone: '9849020002',
        password: 'Password123!',
        businessCategory: 'Supermarket'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.shop.shopId).toBeDefined();

    tokenShop2 = res.body.data.token;
    shop2Id = res.body.data.shop.shopId;
    expect(shop1Id).not.toBe(shop2Id);
  });

  it('3. Shop 1 adds a private product', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tokenShop1}`)
      .send({
        barcode: '890999900001',
        name: 'Shop 1 Exclusive Rice 25kg',
        brand: 'Local Mill',
        category: 'Grains',
        purchasePrice: 1200, // ₹1200
        sellingPrice: 1450,  // ₹1450
        stockQuantity: 50,
        minStockThreshold: 10,
        unit: 'kg'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shopId).toBe(shop1Id);
    shop1ProductId = res.body.data._id;
  });

  it('4. Multi-Tenant Guard: Shop 2 CANNOT access or see Shop 1 product', async () => {
    // Attempt direct GET by ID with Shop 2 token
    const res = await request(app)
      .get(`/api/v1/products/${shop1ProductId}`)
      .set('Authorization', `Bearer ${tokenShop2}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('5. Multi-Tenant Guard: Shop 2 product list does NOT contain Shop 1 products', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${tokenShop2}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const hasShop1Product = res.body.data.some(p => p._id === shop1ProductId);
    expect(hasShop1Product).toBe(false);
  });

  it('6. Billing Engine: Shop 1 completes sale with atomic stock deduction', async () => {
    const idempotencyKey = `test-sale-${Date.now()}`;

    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${tokenShop1}`)
      .send({
        idempotencyKey,
        items: [
          {
            productId: shop1ProductId,
            quantity: 3,
            discountAmount: 0
          }
        ],
        paymentMethod: 'cash',
        customerName: 'Test Customer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.grandTotal).toBe(1450 * 3 * 100); // In paise

    // Verify stock deducted from 50 to 47
    const productRes = await request(app)
      .get(`/api/v1/products/${shop1ProductId}`)
      .set('Authorization', `Bearer ${tokenShop1}`);

    const stock = productRes.body.data.product ? productRes.body.data.product.stockQuantity : productRes.body.data.stockQuantity;
    expect(stock).toBe(47);
  });

  it('7. Idempotency Guard: Repeated checkout returns cached sale without re-decrementing stock', async () => {
    const idempotencyKey = `test-sale-repeat`;

    // First request
    const res1 = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${tokenShop1}`)
      .send({
        idempotencyKey,
        items: [{ productId: shop1ProductId, quantity: 2 }],
        paymentMethod: 'upi'
      });

    expect(res1.status).toBe(201);

    // Second request with SAME idempotency key
    const res2 = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${tokenShop1}`)
      .send({
        idempotencyKey,
        items: [{ productId: shop1ProductId, quantity: 2 }],
        paymentMethod: 'upi'
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data._id).toBe(res1.body.data._id);

    // Stock should be 47 - 2 = 45 (NOT 43)
    const productRes = await request(app)
      .get(`/api/v1/products/${shop1ProductId}`)
      .set('Authorization', `Bearer ${tokenShop1}`);

    const stock = productRes.body.data.product ? productRes.body.data.product.stockQuantity : productRes.body.data.stockQuantity;
    expect(stock).toBe(45);
  });

  it('8. Weight-Based Decimal Billing: Supports loose goods (e.g. 1.5 kg @ ₹1450/kg)', async () => {
    const idempotencyKey = `test-sale-decimal-${Date.now()}`;

    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${tokenShop1}`)
      .send({
        idempotencyKey,
        items: [
          {
            productId: shop1ProductId,
            quantity: 1.5, // 1.5 kg loose product
            discountAmount: 0
          }
        ],
        paymentMethod: 'cash',
        customerName: 'Loose Grain Buyer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // 1450 * 1.5 * 100 paise = 217500 paise (₹2,175.00)
    expect(res.body.data.grandTotal).toBe(217500);

    // Verify stock deducted from 45 to 43.5
    const productRes = await request(app)
      .get(`/api/v1/products/${shop1ProductId}`)
      .set('Authorization', `Bearer ${tokenShop1}`);

    const stock = productRes.body.data.product ? productRes.body.data.product.stockQuantity : productRes.body.data.stockQuantity;
    expect(stock).toBe(43.5);
  });

  it('9. Code 128 Barcode Generation & Registry Management', async () => {
    const res = await request(app)
      .post('/api/v1/barcodes/generate')
      .set('Authorization', `Bearer ${tokenShop1}`)
      .send({
        productId: shop1ProductId,
        labelPreset: '50x30mm'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.barcode).toBeDefined();
    expect(res.body.data.barcode.startsWith('INT')).toBe(true);
    expect(res.body.data.barcodeType).toBe('CODE128');

    // Verify registry record
    const regRes = await request(app)
      .get('/api/v1/barcodes/registry')
      .set('Authorization', `Bearer ${tokenShop1}`);

    expect(regRes.status).toBe(200);
    expect(regRes.body.data.length).toBeGreaterThan(0);
  });
});
