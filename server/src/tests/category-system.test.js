import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { config } from '../config/env.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import {
  initializeMasterCategories,
  migrateExistingProducts,
  getCategoriesForShop,
  createShopCategory,
  deleteShopCategory,
  mergeCategories,
  bulkReassignProducts
} from '../services/category.service.js';
import {
  classifyProduct,
  normalizeCategoryText
} from '../services/category-classifier.service.js';

describe('Intelligent Supermarket Product Categorization & Barcode Registration Tests', () => {
  let tokenA;
  let shopAId;
  let tokenB;
  let shopBId;
  let testProductId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Seed master supermarket categories
    await initializeMasterCategories();

    // Register Shop A
    const resA = await request(app)
      .post('/api/v1/auth/register-shop')
      .send({
        shopName: 'Supermarket Test Shop A',
        ownerName: 'Anil Kumar',
        email: `anil_${Date.now()}@supermarket-test.local`,
        phone: '9849111222',
        password: 'Password123!',
        businessCategory: 'Kirana & Grocery'
      });
    tokenA = resA.body.data.token;
    shopAId = resA.body.data.shop.shopId;

    // Register Shop B (for tenant isolation test)
    const resB = await request(app)
      .post('/api/v1/auth/register-shop')
      .send({
        shopName: 'Supermarket Test Shop B',
        ownerName: 'Balaji Rao',
        email: `balaji_${Date.now()}@supermarket-test.local`,
        phone: '9849333444',
        password: 'Password123!',
        businessCategory: 'Kirana & Grocery'
      });
    tokenB = resB.body.data.token;
    shopBId = resB.body.data.shop.shopId;
  }, 35000);

  afterAll(async () => {
    if (shopAId) {
      await Product.deleteMany({ shopId: shopAId });
      await Category.deleteMany({ shopId: shopAId });
    }
    if (shopBId) {
      await Product.deleteMany({ shopId: shopBId });
      await Category.deleteMany({ shopId: shopBId });
    }
    await mongoose.disconnect();
  }, 35000);

  // SCENARIO 1: Exact match on standard Indian barcode
  it('Scenario 1: Exact match on standard Indian barcode (e.g. 8901058852234 / Maggi Noodles)', async () => {
    const res = await request(app)
      .get('/api/v1/barcodes/lookup/8901058852234')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-shop-id', shopAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.found).toBe(true);
    expect(res.body.data.product.category).toBe('Instant & Ready-to-Cook Food');
    expect(res.body.data.product.subCategory).toBe('Noodles');
    expect(res.body.data.product.classificationStatus).toBe('auto_assigned');
  });

  // SCENARIO 2: Normalization of plural category name
  it('Scenario 2: Normalization of plural category name ("Salts" -> Grocery & Staples)', async () => {
    const classification = await classifyProduct({
      name: 'Patanjali Salt',
      categories: ['Salts']
    });

    expect(classification.category).toBe('Grocery & Staples');
    expect(classification.classificationStatus).toBe('auto_assigned');
    expect(classification.confidence).toBeGreaterThanOrEqual(80);
  });

  // SCENARIO 3: Synonym matching
  it('Scenario 3: Synonym matching ("washing powder" -> Household Cleaning)', async () => {
    const classification = await classifyProduct({
      name: 'Surf Excel Quick Wash',
      categories: ['washing powders']
    });

    expect(classification.category).toBe('Household Cleaning');
    expect(classification.subCategory).toBe('Laundry Detergents & Powders');
    expect(classification.confidence).toBeGreaterThanOrEqual(80);
  });

  // SCENARIO 4: Hierarchical matching (Open Food Facts tag hierarchy)
  it('Scenario 4: Hierarchical matching with Open Food Facts tags (e.g. milks, dairy)', async () => {
    const classification = await classifyProduct({
      name: 'Fresh Cow Milk',
      externalTags: ['en:dairy-products', 'en:milks']
    });

    expect(classification.category).toBe('Dairy & Eggs');
    expect(classification.classificationStatus).toBe('auto_assigned');
  });

  // SCENARIO 5: Keyword matching from product name when barcode category is missing
  it('Scenario 5: Keyword matching from product name when barcode category is missing', async () => {
    const classification = await classifyProduct({
      name: 'Aashirvaad Superior Shudh Chakki Atta 5kg',
      categories: []
    });

    expect(classification.category).toBe('Grocery & Staples');
    expect(classification.subCategory).toBe('Atta & Flours');
    expect(classification.confidence).toBeGreaterThanOrEqual(80);
  });

  // SCENARIO 6: Category creation when valid novel category encountered
  it('Scenario 6: Category creation when valid novel category is created via API', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-shop-id', shopAId)
      .send({
        name: 'Organic Superfoods',
        parentName: 'Grocery & Staples',
        icon: 'Sparkles'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Organic Superfoods');
    expect(res.body.data.parentName).toBe('Grocery & Staples');
    expect(res.body.data.isSystem).toBe(false);
  });

  // SCENARIO 7: Safe fallback to "Others" when no category can be determined without crashing
  it('Scenario 7: Safe fallback to "Others" when no category can be determined', async () => {
    const classification = await classifyProduct({
      name: 'X99 Unknown Non-Descript Widget Model 101',
      categories: []
    });

    expect(classification.category).toBe('Others');
    expect(classification.classificationStatus).toBe('pending_classification');
  });

  // SCENARIO 8: Re-classification of "Others" products via bulk-reassign
  it('Scenario 8: Re-classification of "Others" products via bulk-reassign', async () => {
    // Create product in Others
    const prodRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-shop-id', shopAId)
      .send({
        barcode: 'INT_OTHERS_TEST_' + Date.now(),
        name: 'Unclassified Item',
        category: 'Others',
        classificationStatus: 'pending_classification',
        purchasePrice: 40,
        sellingPrice: 50,
        mrp: 50,
        stockQuantity: 10,
        unit: 'pcs'
      });

    expect(prodRes.status).toBe(201);
    testProductId = prodRes.body.data._id;

    // Bulk reassign to Snacks
    const reassignRes = await request(app)
      .post('/api/v1/categories/bulk-reassign')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-shop-id', shopAId)
      .send({
        productIds: [testProductId],
        targetCategory: 'Snacks',
        targetSubCategory: 'Namkeen & Traditional Snacks'
      });

    expect(reassignRes.status).toBe(200);
    expect(reassignRes.body.data.modifiedCount).toBe(1);

    // Verify product has been updated
    const updatedProd = await Product.findById(testProductId);
    expect(updatedProd.category).toBe('Snacks');
    expect(updatedProd.subCategory).toBe('Namkeen & Traditional Snacks');
    expect(updatedProd.classificationStatus).toBe('manual');
  });

  // SCENARIO 9: Case-insensitive category lookup
  it('Scenario 9: Case-insensitive category lookup and normalization', async () => {
    const c1 = await classifyProduct({ categories: ['DAIRY & EGGS'] });
    const c2 = await classifyProduct({ categories: ['dairy & eggs'] });
    const c3 = await classifyProduct({ categories: ['DaIrY & EgGs'] });

    expect(c1.category).toBe('Dairy & Eggs');
    expect(c2.category).toBe('Dairy & Eggs');
    expect(c3.category).toBe('Dairy & Eggs');
  });

  // SCENARIO 10: Handling of special characters in category names
  it('Scenario 10: Handling of special characters in category names ("Oils & Ghee", "Spices & Masala")', async () => {
    const normalized = normalizeCategoryText('Oils & Ghee / Edible Oils (Refined)');
    expect(normalized).toBe('oils ghee edible oils refined');

    const classification = await classifyProduct({
      name: 'Fortune Sunlite Refined Sunflower Oil 1L'
    });
    expect(classification.category).toBe('Oils & Ghee');
    expect(classification.subCategory).toBe('Sunflower Oil');
  });

  // SCENARIO 11: Migration of legacy products without category loss
  it('Scenario 11: Migration of legacy products without category loss', async () => {
    // Insert a product with legacy string category "Groceries"
    const legacyProd = await Product.create({
      shopId: shopAId,
      barcode: 'LEGACY_TEST_' + Date.now(),
      name: 'Aashirvaad Superior MP Sharbati Atta 5kg',
      category: 'Groceries',
      purchasePrice: 25000,
      sellingPrice: 29500,
      mrp: 29500,
      stockQuantity: 5,
      unit: 'kg'
    });

    const migrationResult = await migrateExistingProducts();
    expect(migrationResult.success).toBe(true);

    const migrated = await Product.findById(legacyProd._id);
    expect(migrated.category).toBe('Grocery & Staples');
    expect(migrated.classificationStatus).toBe('auto_assigned');
  });

  // SCENARIO 12: Idempotent category initialization
  it('Scenario 12: Idempotent category initialization (calling initializeMasterCategories multiple times does not duplicate)', async () => {
    const countBefore = await Category.countDocuments({ isSystem: true });
    expect(countBefore).toBe(147); // 33 main categories + 114 subcategories

    await initializeMasterCategories();
    const countAfter = await Category.countDocuments({ isSystem: true });
    expect(countAfter).toBe(countBefore);
  });

  // SCENARIO 13: Shop isolation (custom categories of Shop A not visible to Shop B)
  it('Scenario 13: Shop isolation (custom categories of Shop A are not visible to Shop B)', async () => {
    const resA = await request(app)
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-shop-id', shopAId);

    const hasOrganicInA = resA.body.data.allCategories.some((c) => c.name === 'Organic Superfoods');
    expect(hasOrganicInA).toBe(true);

    const resB = await request(app)
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-shop-id', shopBId);

    const hasOrganicInB = resB.body.data.allCategories.some((c) => c.name === 'Organic Superfoods');
    expect(hasOrganicInB).toBe(false);
  });

  // SCENARIO 14: System categories cannot be deleted
  it('Scenario 14: System categories cannot be deleted (returns 400)', async () => {
    const systemCategory = await Category.findOne({ isSystem: true, name: 'Dairy & Eggs' });
    expect(systemCategory).toBeTruthy();

    const res = await request(app)
      .delete(`/api/v1/categories/${systemCategory._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-shop-id', shopAId);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/cannot delete a predefined master category|system master categories cannot be deleted/i);
  });

  // SCENARIO 15: Deleting a custom category safely handles existing products
  it('Scenario 15: Deleting a custom category safely handles existing products', async () => {
    // Create a temporary custom category
    const tempCat = await Category.create({
      shopId: shopAId,
      name: 'Temp Discounted Goods',
      isSystem: false,
      isActive: true
    });

    // Create product linked to it
    const linkedProd = await Product.create({
      shopId: shopAId,
      barcode: 'INT_TEMP_PROD_' + Date.now(),
      name: 'Temp Item',
      category: 'Temp Discounted Goods',
      categoryId: tempCat._id,
      purchasePrice: 1500,
      sellingPrice: 2000,
      mrp: 2000,
      stockQuantity: 1,
      unit: 'pcs'
    });

    // Delete custom category
    const deleteRes = await request(app)
      .delete(`/api/v1/categories/${tempCat._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-shop-id', shopAId);

    expect(deleteRes.status).toBe(200);

    // Verify product was safely reassigned to 'Others' without error
    const recheckedProd = await Product.findById(linkedProd._id);
    expect(recheckedProd.category).toBe('Others');
  });

  // SCENARIO 16: Merging two categories moves all products
  it('Scenario 16: Merging two categories moves all products from source to target', async () => {
    // Create source category
    const sourceCat = await Category.create({
      shopId: shopAId,
      name: 'Local Potato Chips',
      isSystem: false,
      isActive: true
    });

    // Find target category (Snacks)
    const targetCat = await Category.findOne({ isSystem: true, name: 'Snacks' });
    expect(targetCat).toBeTruthy();

    // Create 2 products in source category
    await Product.create({
      shopId: shopAId,
      barcode: 'CHIPS_1_' + Date.now(),
      name: 'Masala Chips 50g',
      category: 'Local Potato Chips',
      categoryId: sourceCat._id,
      purchasePrice: 800,
      sellingPrice: 1000,
      mrp: 1000,
      stockQuantity: 20,
      unit: 'pcs'
    });

    await Product.create({
      shopId: shopAId,
      barcode: 'CHIPS_2_' + Date.now(),
      name: 'Salted Chips 50g',
      category: 'Local Potato Chips',
      categoryId: sourceCat._id,
      purchasePrice: 800,
      sellingPrice: 1000,
      mrp: 1000,
      stockQuantity: 15,
      unit: 'pcs'
    });

    // Merge sourceCat into targetCat
    const mergeRes = await request(app)
      .post('/api/v1/categories/merge')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-shop-id', shopAId)
      .send({
        sourceCategoryId: sourceCat._id.toString(),
        targetCategoryId: targetCat._id.toString()
      });

    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.data.reassignedProductsCount).toBeGreaterThanOrEqual(2);

    // Verify products moved to target category
    const productsInTarget = await Product.find({
      shopId: shopAId,
      category: 'Snacks'
    });
    expect(productsInTarget.length).toBeGreaterThanOrEqual(2);

    // Verify source category is deactivated or deleted
    const updatedSource = await Category.findById(sourceCat._id);
    expect(updatedSource.isActive).toBe(false);
  });
});
