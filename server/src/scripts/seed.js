import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';
import { Membership } from '../models/Membership.js';
import { Product } from '../models/Product.js';
import { MasterProduct } from '../models/MasterProduct.js';
import { Sale } from '../models/Sale.js';
import { StockMovement } from '../models/StockMovement.js';
import { Customer } from '../models/Customer.js';

async function seed() {
  console.log('[Seed] Connecting to database:', config.mongoUri);
  await mongoose.connect(config.mongoUri);

  console.log('[Seed] Clearing existing demo data...');
  await Promise.all([
    User.deleteMany({}),
    Shop.deleteMany({}),
    Membership.deleteMany({}),
    Product.deleteMany({}),
    MasterProduct.deleteMany({}),
    Sale.deleteMany({}),
    StockMovement.deleteMany({}),
    Customer.deleteMany({})
  ]);

  console.log('[Seed] Creating Platform Super Admin & Demo Users...');
  const adminPasswordHash = await User.hashPassword('Admin@123456');
  const ownerPasswordHash = await User.hashPassword('Owner@123456');
  const cashierPasswordHash = await User.hashPassword('Cashier@123456');

  // Super Admin
  const superAdmin = await User.create({
    name: 'Platform Super Admin',
    email: 'admin@retailpos.local',
    phone: '9999900000',
    passwordHash: adminPasswordHash,
    isSuperAdmin: true,
    status: 'active'
  });

  // Shop 1 Owner (Kirana)
  const owner1 = await User.create({
    name: 'Ramesh Sharma',
    email: 'ramesh@kirana.local',
    phone: '9849011111',
    passwordHash: ownerPasswordHash,
    isSuperAdmin: false,
    status: 'active'
  });

  // Shop 1 Cashier
  const cashier1 = await User.create({
    name: 'Suresh Kumar',
    email: 'suresh@kirana.local',
    phone: '9849022222',
    passwordHash: cashierPasswordHash,
    isSuperAdmin: false,
    status: 'active'
  });

  // Shop 2 Owner (Supermarket) - for proving multi-tenant isolation
  const owner2 = await User.create({
    name: 'Priya Reddy',
    email: 'priya@supermarket.local',
    phone: '9849033333',
    passwordHash: ownerPasswordHash,
    isSuperAdmin: false,
    status: 'active'
  });

  console.log('[Seed] Creating Tenant Shops...');
  const shop1 = await Shop.create({
    shopId: 'KIRANA01',
    name: 'Sharma General & Kirana Store',
    ownerId: owner1._id,
    contactEmail: owner1.email,
    contactPhone: owner1.phone,
    businessCategory: 'Kirana & Grocery',
    gstin: '36ABCDE1234F1Z5',
    address: {
      street: 'Shop 4, Market Road, Koti',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500095'
    },
    status: 'active',
    subscription: { planId: 'pro', status: 'active' },
    settings: {
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      enableGst: true,
      defaultGstRate: 5,
      receiptHeader: 'Sharma General & Kirana Store\nGSTIN: 36ABCDE1234F1Z5',
      receiptFooter: 'Thank you! Visit again. Quality Guaranteed.',
      lowStockThresholdDefault: 5,
      allowNegativeStock: false
    }
  });

  const shop2 = await Shop.create({
    shopId: 'SUPER02',
    name: 'Prism Supermarket',
    ownerId: owner2._id,
    contactEmail: owner2.email,
    contactPhone: owner2.phone,
    businessCategory: 'Supermarket',
    gstin: '36XYZAB9876C1Z1',
    address: {
      street: 'Plot 12, High Street, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081'
    },
    status: 'active',
    subscription: { planId: 'pro', status: 'active' },
    settings: {
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      enableGst: true,
      defaultGstRate: 18,
      receiptHeader: 'Prism Supermarket\nGSTIN: 36XYZAB9876C1Z1',
      receiptFooter: 'Always low prices! Return within 7 days.',
      lowStockThresholdDefault: 10,
      allowNegativeStock: false
    }
  });

  console.log('[Seed] Assigning Shop Memberships...');
  await Membership.create([
    {
      userId: owner1._id,
      shopId: shop1.shopId,
      role: 'owner',
      permissions: ['pos:bill', 'inventory:manage', 'reports:view', 'settings:manage', 'employees:manage']
    },
    {
      userId: cashier1._id,
      shopId: shop1.shopId,
      role: 'cashier',
      permissions: ['pos:bill']
    },
    {
      userId: owner2._id,
      shopId: shop2.shopId,
      role: 'owner',
      permissions: ['pos:bill', 'inventory:manage', 'reports:view', 'settings:manage', 'employees:manage']
    }
  ]);

  console.log('[Seed] Seeding Shared Master Product Catalog with verified imagery...');
  const masterCatalogData = [
    {
      barcode: '8901030383701',
      name: 'Tata Salt Vacuum Evaporated 1kg',
      brand: 'Tata',
      category: 'Groceries',
      subCategory: 'Salt',
      packSize: '1 kg',
      unit: 'kg',
      imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500&auto=format&fit=crop&q=80',
      mrp: 2800,
      source: 'system_seed'
    },
    {
      barcode: '8901058852234',
      name: 'Maggi 2-Minute Masala Noodles 70g',
      brand: 'Nestle',
      category: 'Instant Food',
      subCategory: 'Noodles',
      packSize: '70 g',
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
      mrp: 1400,
      source: 'system_seed'
    },
    {
      barcode: '8901725181222',
      name: 'Aashirvaad Superior MP Sharbati Atta 5kg',
      brand: 'ITC Aashirvaad',
      category: 'Groceries',
      subCategory: 'Flours',
      packSize: '5 kg',
      unit: 'kg',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
      mrp: 29500,
      source: 'system_seed'
    },
    {
      barcode: '8901491101833',
      name: 'Amul Butter Pasteurized 100g',
      brand: 'Amul',
      category: 'Dairy',
      subCategory: 'Butter',
      packSize: '100 g',
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80',
      mrp: 5800,
      source: 'system_seed'
    },
    {
      barcode: '8901030004569',
      name: 'Surf Excel Quick Wash Detergent 1kg',
      brand: 'Surf Excel',
      category: 'Household',
      subCategory: 'Detergents',
      packSize: '1 kg',
      unit: 'kg',
      imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80',
      mrp: 14500,
      source: 'system_seed'
    },
    {
      barcode: '8901207010118',
      name: 'Dettol Original Germ Protection Soap 75g',
      brand: 'Dettol',
      category: 'Personal Care',
      subCategory: 'Soaps',
      packSize: '75 g',
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=500&auto=format&fit=crop&q=80',
      mrp: 4000,
      source: 'system_seed'
    },
    {
      barcode: '8901725121112',
      name: 'Sunfeast Dark Fantasy Choco Fills 75g',
      brand: 'Sunfeast',
      category: 'Snacks & Biscuits',
      subCategory: 'Biscuits',
      packSize: '75 g',
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80',
      mrp: 3500,
      source: 'system_seed'
    },
    {
      barcode: '8901030654321',
      name: 'Parle-G Gold Glucose Biscuits 250g',
      brand: 'Parle',
      category: 'Snacks & Biscuits',
      subCategory: 'Biscuits',
      packSize: '250 g',
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=500&auto=format&fit=crop&q=80',
      mrp: 2000,
      source: 'system_seed'
    },
    {
      barcode: '8901030825000',
      name: 'Brooke Bond Red Label Tea 500g',
      brand: 'Brooke Bond',
      category: 'Beverages',
      subCategory: 'Tea',
      packSize: '500 g',
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
      mrp: 27000,
      source: 'system_seed'
    },
    {
      barcode: '8906007280011',
      name: 'Fortune Sunlite Refined Sunflower Oil 1L',
      brand: 'Fortune',
      category: 'Edible Oils',
      subCategory: 'Oil',
      packSize: '1 L',
      unit: 'l',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
      mrp: 15500,
      source: 'system_seed'
    }
  ];

  await MasterProduct.insertMany(masterCatalogData);

  console.log('[Seed] Seeding Products for Shop 1 (Sharma Kirana)...');
  const shop1Products = [
    {
      shopId: shop1.shopId,
      barcode: '8901030383701',
      name: 'Tata Salt Vacuum Evaporated 1kg',
      brand: 'Tata',
      category: 'Groceries',
      imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 2200, // ₹22.00
      sellingPrice: 2600,  // ₹26.00
      mrp: 2800,           // ₹28.00
      taxRate: 0,
      stockQuantity: 120,
      minStockThreshold: 15,
      unit: 'kg',
      packSize: '1 kg'
    },
    {
      shopId: shop1.shopId,
      barcode: '8901058852234',
      name: 'Maggi 2-Minute Masala Noodles 70g',
      brand: 'Nestle',
      category: 'Instant Food',
      imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 1150, // ₹11.50
      sellingPrice: 1400,  // ₹14.00
      mrp: 1400,
      taxRate: 12,
      stockQuantity: 84,
      minStockThreshold: 20,
      unit: 'pcs',
      packSize: '70 g'
    },
    {
      shopId: shop1.shopId,
      barcode: '8901725181222',
      name: 'Aashirvaad Superior MP Sharbati Atta 5kg',
      brand: 'ITC Aashirvaad',
      category: 'Groceries',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 24500, // ₹245.00
      sellingPrice: 28000, // ₹280.00
      mrp: 29500,
      taxRate: 0,
      stockQuantity: 25,
      minStockThreshold: 5,
      unit: 'kg',
      packSize: '5 kg'
    },
    {
      shopId: shop1.shopId,
      barcode: '8901491101833',
      name: 'Amul Butter Pasteurized 100g',
      brand: 'Amul',
      category: 'Dairy',
      imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 4900,
      sellingPrice: 5600,
      mrp: 5800,
      taxRate: 12,
      stockQuantity: 4, // LOW STOCK TRIGGER
      minStockThreshold: 10,
      unit: 'pcs',
      packSize: '100 g'
    },
    {
      shopId: shop1.shopId,
      barcode: '8901030004569',
      name: 'Surf Excel Quick Wash Detergent 1kg',
      brand: 'Surf Excel',
      category: 'Household',
      imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 11800,
      sellingPrice: 13900,
      mrp: 14500,
      taxRate: 18,
      stockQuantity: 0, // OUT OF STOCK TRIGGER
      minStockThreshold: 5,
      unit: 'kg',
      packSize: '1 kg'
    },
    {
      shopId: shop1.shopId,
      barcode: '8901030654321',
      name: 'Parle-G Gold Glucose Biscuits 250g',
      brand: 'Parle',
      category: 'Snacks & Biscuits',
      imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 1600,
      sellingPrice: 1900,
      mrp: 2000,
      taxRate: 18,
      stockQuantity: 150,
      minStockThreshold: 25,
      unit: 'pcs',
      packSize: '250 g'
    },
    {
      shopId: shop1.shopId,
      barcode: '8901030825000',
      name: 'Brooke Bond Red Label Tea 500g',
      brand: 'Brooke Bond',
      category: 'Beverages',
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 23000,
      sellingPrice: 26000,
      mrp: 27000,
      taxRate: 5,
      stockQuantity: 35,
      minStockThreshold: 8,
      unit: 'pcs',
      packSize: '500 g'
    },
    {
      shopId: shop1.shopId,
      barcode: '8906007280011',
      name: 'Fortune Sunlite Refined Sunflower Oil 1L',
      brand: 'Fortune',
      category: 'Edible Oils',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 13500,
      sellingPrice: 14800,
      mrp: 15500,
      taxRate: 5,
      stockQuantity: 42,
      minStockThreshold: 10,
      unit: 'l',
      packSize: '1 L'
    },
    {
      shopId: shop1.shopId,
      barcode: 'INT100101',
      isSystemBarcode: true,
      name: 'Loose Jeera / Cumin Seeds (250g Pack)',
      brand: 'In-house',
      category: 'Spices',
      imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 7000,
      sellingPrice: 9500,
      mrp: 11000,
      taxRate: 5,
      stockQuantity: 40,
      minStockThreshold: 8,
      unit: 'pack',
      packSize: '250 g'
    }
  ];

  const createdShop1Products = await Product.insertMany(shop1Products);

  console.log('[Seed] Seeding Products for Shop 2 (Prism Supermarket)...');
  const shop2Products = [
    {
      shopId: shop2.shopId,
      barcode: '8901030383701',
      name: 'Tata Salt Vacuum Evaporated 1kg',
      brand: 'Tata',
      category: 'Groceries',
      imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 2100, // Bulk price advantage
      sellingPrice: 2500,  // Different selling price than Shop 1
      mrp: 2800,
      taxRate: 0,
      stockQuantity: 500,
      minStockThreshold: 50,
      unit: 'kg',
      packSize: '1 kg'
    },
    {
      shopId: shop2.shopId,
      barcode: '8901207010118',
      name: 'Dettol Original Germ Protection Soap 75g',
      brand: 'Dettol',
      category: 'Personal Care',
      imageUrl: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=500&auto=format&fit=crop&q=80',
      purchasePrice: 3200,
      sellingPrice: 3800,
      mrp: 4000,
      taxRate: 18,
      stockQuantity: 200,
      minStockThreshold: 30,
      unit: 'pcs',
      packSize: '75 g'
    }
  ];
  await Product.insertMany(shop2Products);

  console.log('[Seed] Seeding Customers for Shop 1...');
  const customer1 = await Customer.create({
    shopId: shop1.shopId,
    name: 'Anand Varma',
    phone: '9849098765',
    email: 'anand@example.com',
    totalPurchases: 450000,
    totalBills: 12,
    outstandingUdhaar: 0
  });

  console.log('[Seed] Seeding Completed Demo Sales for Shop 1...');
  // Completed bill 1
  const sale1 = await Sale.create({
    shopId: shop1.shopId,
    invoiceNumber: 'INV-202611-00001',
    idempotencyKey: 'seed-sale-001',
    cashierId: cashier1._id,
    cashierName: cashier1.name,
    customerId: customer1._id,
    customerName: customer1.name,
    customerPhone: customer1.phone,
    items: [
      {
        productId: createdShop1Products[0]._id,
        barcode: createdShop1Products[0].barcode,
        name: createdShop1Products[0].name,
        quantity: 2,
        unitPrice: 2600,
        mrp: 2800,
        purchasePrice: 2200,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 5200
      },
      {
        productId: createdShop1Products[1]._id,
        barcode: createdShop1Products[1].barcode,
        name: createdShop1Products[1].name,
        quantity: 3,
        unitPrice: 1400,
        mrp: 1400,
        purchasePrice: 1150,
        discountAmount: 0,
        taxRate: 12,
        taxAmount: 504,
        lineTotal: 4704
      }
    ],
    subtotal: 9400,
    totalDiscount: 0,
    totalTax: 504,
    grandTotal: 9904,
    totalCost: 7850,
    paymentMethod: 'upi',
    paymentDetails: {
      receivedAmount: 9904,
      changeReturned: 0,
      referenceNote: 'GPay UPI txn #401928'
    },
    status: 'completed',
    saleDate: new Date(Date.now() - 3600 * 1000 * 4)
  });

  // Completed bill 2
  await Sale.create({
    shopId: shop1.shopId,
    invoiceNumber: 'INV-202611-00002',
    idempotencyKey: 'seed-sale-002',
    cashierId: cashier1._id,
    cashierName: cashier1.name,
    customerName: 'Walk-in Customer',
    items: [
      {
        productId: createdShop1Products[5]._id,
        barcode: createdShop1Products[5].barcode,
        name: createdShop1Products[5].name,
        quantity: 5,
        unitPrice: 1900,
        mrp: 2000,
        purchasePrice: 1600,
        discountAmount: 0,
        taxRate: 18,
        taxAmount: 1710,
        lineTotal: 11210
      }
    ],
    subtotal: 9500,
    totalDiscount: 0,
    totalTax: 1710,
    grandTotal: 11210,
    totalCost: 8000,
    paymentMethod: 'cash',
    paymentDetails: {
      receivedAmount: 12000,
      changeReturned: 790,
      referenceNote: ''
    },
    status: 'completed',
    saleDate: new Date(Date.now() - 3600 * 1000 * 1)
  });

  console.log('[Seed] Database successfully re-seeded with high-res imagery!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
