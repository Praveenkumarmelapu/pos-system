# Multi-Tenant Retail POS SaaS - Database Design

## 1. Database Overview
- **Engine**: MongoDB (v7.0+ / v8.0+)
- **Architecture**: Single logical database with collection-level multitenancy.
- **Tenant Partitioning**: All tenant collections enforce `shopId` as a mandatory indexed string field.
- **Monetary Storage**: Stored in Paise (integers: 1 INR = 100 Paise) or validated decimal fields to avoid IEEE 754 floating point inaccuracies.

---

## 2. Collections & Schema Definitions

### 2.1 Platform Collections (Global / Cross-Tenant)

#### `shops`
```json
{
  "_id": "ObjectId",
  "shopId": "SHOP_A7B2C9",          // Unique uppercase tenant code
  "name": "Sri Krishna Provision Store",
  "ownerId": "ObjectId (ref: users)",
  "contactEmail": "owner@example.com",
  "contactPhone": "+919876543210",
  "businessCategory": "Kirana & Grocery", // grocery, stationery, cosmetics, supermarket, etc.
  "gstin": "36AAAAA0000A1Z5",        // Optional GSTIN
  "address": {
    "street": "Main Road, Gandhi Nagar",
    "city": "Hyderabad",
    "state": "Telangana",
    "pincode": "500001",
    "country": "India"
  },
  "status": "active",                // active, suspended, pending
  "subscription": {
    "planId": "pro",                 // free, basic, pro, enterprise
    "status": "active",              // trial, active, past_due, canceled
    "expiresAt": "ISODate"
  },
  "settings": {
    "currency": "INR",
    "currencySymbol": "₹",
    "timezone": "Asia/Kolkata",
    "enableGst": true,
    "defaultGstRate": 5,             // 0, 5, 12, 18, 28
    "receiptHeader": "Sri Krishna Provision Store",
    "receiptFooter": "Thank you for shopping with us! Visit again.",
    "lowStockThresholdDefault": 5,
    "allowNegativeStock": false
  },
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
**Indexes**:
- `{ shopId: 1 }` (Unique)
- `{ status: 1 }`
- `{ "subscription.planId": 1 }`

---

#### `users`
```json
{
  "_id": "ObjectId",
  "name": "Praveen Melapu",
  "email": "praveen@example.com",
  "phone": "+919876543210",
  "passwordHash": "$argon2id$...",
  "isSuperAdmin": false,             // Strictly false for shop staff
  "status": "active",                // active, suspended, deactivated
  "lastLoginAt": "ISODate",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
**Indexes**:
- `{ email: 1 }` (Unique)
- `{ phone: 1 }` (Sparse, unique)

---

#### `memberships` (User-to-Shop Mapping)
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "shopId": "SHOP_A7B2C9",
  "role": "owner",                   // owner, manager, cashier
  "permissions": ["pos:bill", "inventory:manage", "reports:view", "settings:manage"],
  "status": "active",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
**Indexes**:
- `{ userId: 1, shopId: 1 }` (Unique compound)
- `{ shopId: 1, role: 1 }`

---

#### `masterProducts` (Shared Global Catalog)
```json
{
  "_id": "ObjectId",
  "barcode": "8901030383701",        // Verified EAN-13
  "name": "Tata Salt Vacuum Evaporated",
  "brand": "Tata",
  "category": "Groceries",
  "subCategory": "Edible Salts",
  "packSize": "1 kg",
  "unit": "kg",
  "imageUrl": "https://...",
  "verified": true,
  "source": "open_food_facts",       // system_seed, open_food_facts, verified_contribution
  "mrp": 2800,                       // 28.00 INR in paise
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
**Indexes**:
- `{ barcode: 1 }` (Unique)
- `{ name: "text", brand: "text" }`

---

### 2.2 Tenant-Scoped Collections

#### `products` (Shop Inventory Items)
```json
{
  "_id": "ObjectId",
  "shopId": "SHOP_A7B2C9",          // Mandatory tenant partition
  "barcode": "8901030383701",        // EAN-13 or internal generated barcode
  "isSystemBarcode": false,          // True if internally generated code
  "name": "Tata Salt Vacuum Evaporated 1kg",
  "brand": "Tata",
  "category": "Groceries",
  "description": "Iodised salt for daily cooking",
  "imageUrl": "https://...",
  "purchasePrice": 2200,             // In paise (₹22.00)
  "sellingPrice": 2700,              // In paise (₹27.00)
  "mrp": 2800,                       // In paise (₹28.00)
  "taxRate": 0,                      // GST percentage (e.g., 0, 5, 12, 18)
  "stockQuantity": 150,              // Current available units
  "minStockThreshold": 15,           // Low-stock trigger
  "unit": "kg",                      // pcs, kg, g, l, ml, pack
  "isActive": true,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
**Indexes**:
- `{ shopId: 1, barcode: 1 }` (Unique compound index per shop)
- `{ shopId: 1, isActive: 1, stockQuantity: 1 }`
- `{ shopId: 1, name: "text", brand: "text", category: 1 }`

---

#### `sales` (Bills / Invoices)
```json
{
  "_id": "ObjectId",
  "shopId": "SHOP_A7B2C9",
  "invoiceNumber": "INV-202611-00042",
  "idempotencyKey": "uuid-v4-client-key",
  "cashierId": "ObjectId (ref: users)",
  "cashierName": "Praveen",
  "customerId": "ObjectId (ref: customers, optional)",
  "customerName": "Walk-in Customer",
  "customerPhone": null,
  "items": [
    {
      "productId": "ObjectId (ref: products)",
      "barcode": "8901030383701",
      "name": "Tata Salt Vacuum Evaporated 1kg",
      "quantity": 2,
      "unitPrice": 2700,             // In paise
      "mrp": 2800,
      "discountAmount": 0,
      "taxRate": 0,
      "taxAmount": 0,
      "lineTotal": 5400              // (unitPrice * qty) - discount
    }
  ],
  "subtotal": 5400,
  "totalDiscount": 0,
  "totalTax": 0,
  "roundingAdjustment": 0,
  "grandTotal": 5400,                // Final bill amount in paise
  "paymentMethod": "upi",            // cash, upi, card, split, credit
  "paymentDetails": {
    "receivedAmount": 5400,
    "changeReturned": 0,
    "referenceNote": "GPay UPI Ref"
  },
  "status": "completed",             // completed, returned, cancelled
  "saleDate": "ISODate",             // UTC timestamp
  "notes": "",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
**Indexes**:
- `{ shopId: 1, invoiceNumber: 1 }` (Unique)
- `{ shopId: 1, idempotencyKey: 1 }` (Unique compound)
- `{ shopId: 1, saleDate: -1 }`
- `{ shopId: 1, status: 1 }`
- `{ shopId: 1, cashierId: 1 }`

---

#### `stockMovements` (Audit Ledger)
```json
{
  "_id": "ObjectId",
  "shopId": "SHOP_A7B2C9",
  "productId": "ObjectId (ref: products)",
  "barcode": "8901030383701",
  "type": "sale",                    // sale, purchase, manual_adjustment, return, damage
  "quantityDelta": -2,               // Negative for stock reduction, positive for addition
  "previousStock": 150,
  "newStock": 148,
  "referenceId": "ObjectId (ref: sales or purchases)",
  "reason": "Invoice INV-202611-00042",
  "performedBy": "ObjectId (ref: users)",
  "createdAt": "ISODate"
}
```
**Indexes**:
- `{ shopId: 1, productId: 1, createdAt: -1 }`
- `{ shopId: 1, type: 1, createdAt: -1 }`

---

#### `customers`
```json
{
  "_id": "ObjectId",
  "shopId": "SHOP_A7B2C9",
  "name": "Ramesh Kumar",
  "phone": "+919849012345",
  "email": "ramesh@example.com",
  "totalPurchases": 124000,          // In paise
  "totalBills": 14,
  "outstandingUdhaar": 0,            // Credit balance in paise
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
**Indexes**:
- `{ shopId: 1, phone: 1 }` (Unique compound per shop)
- `{ shopId: 1, name: 1 }`

---

#### `purchases` (Stock Inward Records)
```json
{
  "_id": "ObjectId",
  "shopId": "SHOP_A7B2C9",
  "purchaseInvoiceNumber": "SUPP-9812",
  "supplierName": "Metro Cash & Carry",
  "supplierContact": "+919811122233",
  "items": [
    {
      "productId": "ObjectId (ref: products)",
      "barcode": "8901030383701",
      "quantityReceived": 50,
      "purchaseRate": 2200,          // in paise
      "lineTotal": 110000
    }
  ],
  "totalAmount": 110000,
  "paymentStatus": "paid",           // paid, partial, pending
  "purchaseDate": "ISODate",
  "receivedBy": "ObjectId (ref: users)",
  "createdAt": "ISODate"
}
```
**Indexes**:
- `{ shopId: 1, purchaseDate: -1 }`

---

#### `auditLogs`
```json
{
  "_id": "ObjectId",
  "shopId": "SHOP_A7B2C9",          // or "PLATFORM" for super-admin actions
  "userId": "ObjectId",
  "action": "product:price_update",
  "resourceType": "product",
  "resourceId": "ObjectId",
  "details": {
    "oldPrice": 2500,
    "newPrice": 2700
  },
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "ISODate"
}
```
**Indexes**:
- `{ shopId: 1, createdAt: -1 }`
- `{ userId: 1, createdAt: -1 }`
