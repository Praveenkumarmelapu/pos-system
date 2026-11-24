import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { config } from '../config/env.js';

describe('Khata (Customer Credit Ledger) Integration Tests', () => {
  let token;
  let shopId;
  let customerId;
  let productId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 30000);

  it('1. Register shop for Khata test', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-shop')
      .send({
        shopName: 'Khata Kirana Store',
        ownerName: 'Venkatesh Rao',
        email: `venkat_${Date.now()}@khatatest.local`,
        phone: '9849099887',
        password: 'Password123!',
        businessCategory: 'Kirana & Grocery'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    token = res.body.data.token;
    shopId = res.body.data.shop.shopId;
  });

  it('2. Create a customer with credit limit', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Suresh Varma',
        phone: '9988776655',
        creditLimit: 5000,
        address: 'Bazaar Street'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.outstandingUdhaar).toBe(0);
    customerId = res.body.data._id;
  });

  it('3. Add a product for billing', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Premium Basmati Rice 5kg',
        barcode: `890123${Date.now().toString().slice(-6)}`,
        sellingPrice: 500, // ₹500 (50,000 Paise)
        mrp: 550,
        purchasePrice: 420,
        stockQuantity: 50,
        unit: 'pcs',
        category: 'Grocery'
      });

    expect(res.status).toBe(201);
    productId = res.body.data._id;
  });

  it('4. Process Split / Partial Payment Sale (Total: ₹500, Paid: ₹200, Khata Credit: ₹300)', async () => {
    const idempotencyKey = `sale_test_${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idempotencyKey,
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'split',
        paidAmount: 200,
        creditAmount: 300,
        paymentBreakdown: { cash: 200, credit: 300 },
        customerId,
        customerName: 'Suresh Varma'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.grandTotal).toBe(50000); // 50,000 Paise = ₹500
    expect(res.body.data.paidAmount).toBe(20000); // 20,000 Paise = ₹200
    expect(res.body.data.creditAmount).toBe(30000); // 30,000 Paise = ₹300
    expect(res.body.data.isKhata).toBe(true);
  });

  it('5. Verify Customer outstanding debt increased to ₹300', async () => {
    const res = await request(app)
      .get(`/api/v1/khata/customers/${customerId}/ledger`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customer.outstandingUdhaar).toBe(30000); // 30,000 Paise = ₹300
    expect(res.body.data.entries.length).toBe(1);
    expect(res.body.data.entries[0].entryType).toBe('credit_sale');
    expect(res.body.data.entries[0].debit).toBe(30000);
    expect(res.body.data.entries[0].runningBalance).toBe(30000);
  });

  it('6. Receive payment of ₹100 towards Khata debt', async () => {
    const idempotencyKey = `pay_test_${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/khata/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        amount: 100, // ₹100
        paymentMethod: 'cash',
        referenceNote: 'Cash clearance',
        idempotencyKey
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updatedBalance).toBe(20000); // ₹200 remaining (20,000 Paise)
    expect(res.body.data.payment.receiptNumber).toMatch(/^REC-/);
  });

  it('7. Idempotency test: duplicate payment request returns same record without double decrement', async () => {
    const idempotencyKey = `pay_idem_${Date.now()}`;
    const payPayload = {
      customerId,
      amount: 50,
      paymentMethod: 'upi',
      referenceNote: 'GPay payment',
      idempotencyKey
    };

    const res1 = await request(app)
      .post('/api/v1/khata/payments')
      .set('Authorization', `Bearer ${token}`)
      .send(payPayload);

    expect(res1.status).toBe(201);
    expect(res1.body.data.updatedBalance).toBe(15000); // ₹150 remaining

    const res2 = await request(app)
      .post('/api/v1/khata/payments')
      .set('Authorization', `Bearer ${token}`)
      .send(payPayload);

    expect(res2.status).toBe(200);
    expect(res2.body.message).toContain('already processed');

    // Verify balance is still ₹150 (not ₹100)
    const ledgerRes = await request(app)
      .get(`/api/v1/khata/customers/${customerId}/ledger`)
      .set('Authorization', `Bearer ${token}`);

    expect(ledgerRes.body.data.customer.outstandingUdhaar).toBe(15000);
  });

  it('8. Khata Summary aggregation matches shop totals', async () => {
    const res = await request(app)
      .get('/api/v1/khata/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalOutstandingPaise).toBe(15000); // ₹150
    expect(res.body.data.debtorCount).toBe(1);
    expect(res.body.data.monthCollectedPaise).toBe(15000); // ₹100 + ₹50
  });

  it('9. Record WhatsApp Khata payment reminder', async () => {
    const res = await request(app)
      .post(`/api/v1/khata/customers/${customerId}/reminder`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        channel: 'whatsapp',
        customNote: 'Please pay by end of week',
        phone: '9988776655'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lastReminderSentAt).toBeDefined();
    expect(res.body.data.reminderCount).toBe(1);

    // Verify customer record updated
    const custRes = await request(app)
      .get(`/api/v1/khata/customers/${customerId}/ledger`)
      .set('Authorization', `Bearer ${token}`);

    expect(custRes.body.data.customer.lastReminderSentAt).toBeDefined();
    expect(custRes.body.data.customer.reminderCount).toBe(1);
  });
});
