# Multi-Tenant Retail POS SaaS - System Architecture

## 1. Executive Summary & Core Objective
The Retail POS SaaS is a multi-tenant cloud application engineered specifically for Indian retail ecosystems (Kirana, grocery, general stores, stationery, cosmetics, supermarkets). The platform provides independent shopkeepers with rapid POS checkout, barcode scanning (mobile camera & USB/Bluetooth HID), automated master catalog lookups (Open Food Facts & shared catalog), inventory valuation, GST calculation, sales analytics, and role-based access control.

Platform owners operate a distinct Super Admin dashboard for tenant lifecycle management, feature tier provisioning, and system metrics.

---

## 2. Multi-Tenant Isolation Model

### 2.1 Logical Isolation with Scoped Partitioning
- **Database Strategy**: Shared MongoDB Database, Shared Collections with Mandatory Logical Partitioning.
- **Tenant Key**: Immutable `shopId` (indexed uppercase alphanumeric identifier, e.g., `SHOP_XXXXX`) attached to every tenant-owned document.
- **Zero-Trust Client Identity**:
  - The client NEVER supplies `shopId` in query payloads or request bodies as an authorization mechanism.
  - On every authenticated request, JWT tokens contain verified `userId`.
  - The `tenantContext` middleware inspects the active user's verified tenant membership, resolves the active `shopId` and `role`, and binds it to `req.tenant = { shopId, role, userId, permissions }`.
  - Mongoose query helpers and pre-query hooks enforce `shopId: req.tenant.shopId` on all CRUD and aggregation operations.

### 2.2 Cross-Tenant Boundary Enforcement
```
                      +-----------------------------+
                      |   Client Request (Browser)  |
                      +--------------+--------------+
                                     | HttpOnly Cookie / Authorization Bearer
                                     v
                      +-----------------------------+
                      |   Authentication Layer      |
                      |   (Verify JWT & Session)    |
                      +--------------+--------------+
                                     | Verified userId
                                     v
                      +-----------------------------+
                      |  Tenant Context Middleware  |
                      | (Resolve Active Membership) |
                      +--------------+--------------+
                                     | req.tenant = { shopId, role }
                                     v
                      +-----------------------------+
                      |    RBAC Permission Guard    |
                      +--------------+--------------+
                                     | Authorized
                                     v
                      +-----------------------------+
                      | Controller & Domain Service |
                      +--------------+--------------+
                                     | shopId injected into all queries
                                     v
        +-------------------------------------------------------+
        |                 MongoDB Multi-Tenant DB               |
        |  Compound Indexes: { shopId: 1, barcode: 1 }          |
        |  Compound Indexes: { shopId: 1, createdAt: -1 }       |
        +-------------------------------------------------------+
```

---

## 3. High-Level System Architecture

```
+------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                     |
|  React 18 + Vite + Tailwind CSS + TanStack Query + React Router + Lucide Icons    |
|  - POS Billing Screen (Desktop dual-pane & Mobile low-latency responsive)          |
|  - Smart Barcode Scanner Engine (@zxing/browser camera + USB/HID keyboard buffer)  |
|  - Inventory, Products, Reports, Settings, Customer Management                     |
|  - Super Admin Dashboard (Platform analytics, Shop activation/suspension)         |
+------------------------------------------+-----------------------------------------+
                                           | HTTPS / JSON REST APIs
                                           v
+------------------------------------------------------------------------------------+
|                                   BACKEND TIER                                     |
|  Node.js (LTS) + Express.js + Mongoose ODM                                         |
|  - Security: Helmet, CORS, Rate-Limiting, Mongo-Sanitize, Zod schema validation    |
|  - Middleware: Auth Guard, Tenant Context, Role Enforcement (RBAC), Error Handler  |
|  - Business Services:                                                              |
|    * Barcode Lookup Service (Local Shop -> Master Catalog -> Open Food Facts)      |
|    * Billing & Checkout Engine (Idempotency keys, atomic stock decrement)         |
|    * Inventory Movement Ledger (Audit trail for every stock delta)                 |
|    * Financial & GST Calculation Service (Integer minor units / Paise precision)   |
|    * Reporting Engine (Asia/Kolkata timezone normalization)                       |
+------------------------------------------+-----------------------------------------+
                                           | MongoDB Driver (Replica Set / Txns)
                                           v
+------------------------------------------------------------------------------------+
|                                   DATA TIER                                        |
|  MongoDB (Shared Database with strict shopId partitioning)                         |
|  - Tenant Collections: products, sales, stockMovements, purchases, customers, etc. |
|  - Platform Collections: shops, users, memberships, masterProducts, subscriptions  |
+------------------------------------------------------------------------------------+
```

---

## 4. Key Subsystem Specifications

### 4.1 Smart Barcode & Catalog Pipeline
1. **Scanner Input Handler**:
   - Supports mobile camera via `@zxing/browser` stream with torch and sound cue.
   - Supports high-speed USB/Bluetooth HID scanners via hardware keyboard stroke buffer (detecting inter-keystroke timing `< 35ms` terminating with `Enter`).
2. **Cascading Lookup Hierarchy**:
   - **Level 1**: Active Shop Inventory (`db.products.findOne({ shopId, barcode })`). If found, returns shop product with current selling price & stock.
   - **Level 2**: Shared Master Catalog (`db.masterProducts.findOne({ barcode })`). Curated verified Indian packaged goods.
   - **Level 3**: External Public Catalog (Open Food Facts API / Open Beauty Facts API with 2-second timeout and fallback).
3. **Editable Auto-Fill**:
   - Returned metadata (name, brand, category, image, pack size) populates the product form.
   - Shopkeeper retains full control to edit title, MRP, purchase price, selling price, tax rate (GST %), and opening stock.
   - External images are sanitized and cached safely; user can replace with direct upload.

### 4.2 Billing, Checkout & Transaction Safety
- **Idempotency Key**: Checkout requests require a unique client-generated UUID (`idempotencyKey`). Duplicate requests return the existing invoice without re-processing stock.
- **Atomic Stock Deduction**: Checkout uses MongoDB sessions (`withTransaction`) or atomic conditional decrements (`stockQuantity: { $gte: item.quantity }`) to prevent overselling or race conditions.
- **Monetary Precision**: All monetary values are calculated and stored in **Paise** (integer minor units: ₹1.00 = 100 paise) or validated 2-decimal numbers to eradicate floating-point drift.
- **Server-Authoritative Pricing**: Frontend sends only `{ productId, quantity, lineDiscount }`. The backend reads authoritative pricing and tax configuration from the database.

### 4.3 Timezone & Localization
- **Storage**: All database timestamps (`createdAt`, `updatedAt`, `saleDate`) stored in UTC (`ISO 8601`).
- **Reporting & Business Day Cutoff**: Default reporting boundary calculated using `Asia/Kolkata` (+05:30) offset.
- **Receipts**: Printable 58mm/80mm thermal CSS media layouts and browser-compatible print dialogue.
