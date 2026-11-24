# Multi-Tenant Retail POS SaaS - API Specification (v1)

## 1. Global Conventions

- **Base URL**: `/api/v1`
- **Response Format**: All responses adhere to the standard envelope:
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": { ... },
    "meta": {
      "page": 1,
      "limit": 25,
      "total": 120
    }
  }
  ```
- **Error Format**:
  ```json
  {
    "success": false,
    "error": {
      "code": "INSUFFICIENT_STOCK",
      "message": "Requested 5 units of 'Tata Salt' but only 2 remain in stock.",
      "details": []
    }
  }
  ```
- **Authentication**: JWT token sent via `Authorization: Bearer <token>` or HttpOnly cookie `pos_token`.
- **Tenant Context**: Inferred strictly from authenticated user's active shop membership.

---

## 2. Authentication & Onboarding Endpoints

### `POST /api/v1/auth/register-shop`
Creates shop, default settings, and assigns the user as `owner`.
- **Request Body**:
  ```json
  {
    "shopName": "Sri Krishna Provision Store",
    "ownerName": "Praveen Melapu",
    "email": "praveen@example.com",
    "phone": "9876543210",
    "password": "SecurePassword123!",
    "businessCategory": "Kirana & Grocery",
    "gstin": "36AAAAA0000A1Z5",
    "address": {
      "street": "Main Road",
      "city": "Hyderabad",
      "state": "Telangana",
      "pincode": "500001"
    }
  }
  ```
- **Response**: `201 Created` with shop & user payload and JWT token.

### `POST /api/v1/auth/login`
- **Request Body**: `{ "email": "praveen@example.com", "password": "..." }`
- **Response**: `200 OK` with token, user info, active shop profile, and permissions.

### `GET /api/v1/auth/me`
- **Response**: Current authenticated user profile, active shop, and roles.

### `POST /api/v1/auth/logout`
- Clears session cookie and invalidates client state.

---

## 3. Barcode Lookup Service

### `GET /api/v1/barcodes/lookup/:barcode`
Cascading smart lookup:
1. Active Shop Inventory (`db.products`)
2. Shared Master Catalog (`db.masterProducts`)
3. Open Food Facts API (external normalized query)
- **Response 200 (Found in Shop)**:
  ```json
  {
    "success": true,
    "data": {
      "source": "shop_inventory",
      "found": true,
      "product": {
        "_id": "67...",
        "barcode": "8901030383701",
        "name": "Tata Salt Vacuum Evaporated 1kg",
        "sellingPrice": 2700,
        "stockQuantity": 150
      }
    }
  }
  ```
- **Response 200 (Found in Master / External Catalog)**:
  ```json
  {
    "success": true,
    "data": {
      "source": "master_catalog",
      "found": true,
      "product": {
        "barcode": "8901030383701",
        "name": "Tata Salt Vacuum Evaporated",
        "brand": "Tata",
        "category": "Groceries",
        "packSize": "1 kg",
        "unit": "kg",
        "imageUrl": "https://...",
        "mrp": 2800,
        "isNewToShop": true
      }
    }
  }
  ```
- **Response 200 (Not Found anywhere)**:
  ```json
  {
    "success": true,
    "data": {
      "source": "none",
      "found": false,
      "barcode": "8909999999999",
      "message": "Barcode not recognized. Ready for manual registration."
    }
  }
  ```

---

## 4. Product Management Endpoints

- `GET /api/v1/products` - List products with search, pagination (`page`, `limit`), category filter, stock status (`low`, `out`, `all`).
- `POST /api/v1/products` - Create a new shop product.
- `GET /api/v1/products/:id` - Fetch single product details.
- `PATCH /api/v1/products/:id` - Update product details, prices, or thresholds.
- `DELETE /api/v1/products/:id` - Soft archive product (`isActive: false`).
- `POST /api/v1/products/generate-barcode` - Generates a valid internal Code 128 / EAN compatible barcode string.
- `POST /api/v1/products/bulk-import` - Parse CSV and insert shop-scoped products.

---

## 5. Billing & POS Endpoints

### `POST /api/v1/sales`
Complete a sale with atomic stock deduction and idempotency check.
- **Headers**: `Idempotency-Key: <UUID>`
- **Request Body**:
  ```json
  {
    "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "items": [
      {
        "productId": "67...31a",
        "quantity": 2,
        "discountAmount": 0
      }
    ],
    "billDiscount": 0,
    "paymentMethod": "upi",
    "paymentDetails": {
      "receivedAmount": 5400,
      "referenceNote": "GPay UPI"
    },
    "customerId": null,
    "customerName": "Walk-in Customer"
  }
  ```
- **Response**: `201 Created` with invoice snapshot, thermal receipt payload, and updated stock indicators.

### `GET /api/v1/sales`
Query sales history with date range filtering (`startDate`, `endDate`), cashier filter, and pagination.

### `GET /api/v1/sales/:id`
Fetch single sale invoice with itemized line snapshots.

---

## 6. Inventory & Stock Management

- `GET /api/v1/inventory/movements` - Query stock audit ledger with filters (`productId`, `type`, `dateRange`).
- `POST /api/v1/inventory/adjust` - Manual stock adjustment with audit reason (`damage`, `loss`, `count_correction`).
- `POST /api/v1/purchases` - Record stock inward purchase and auto-increment product quantities.

---

## 7. Reports & Analytics

- `GET /api/v1/reports/dashboard` - Real-time stats: Today's sales, Monthly sales, Bills count, Average bill, Low-stock alerts.
- `GET /api/v1/reports/sales-trends` - Grouped sales aggregated by day/week in `Asia/Kolkata` timezone.
- `GET /api/v1/reports/top-products` - Top selling items by quantity and revenue.

---

## 8. Super Admin Endpoints (Platform Owner)

- `GET /api/v1/admin/shops` - List all registered shops, tenant metrics, and subscription statuses.
- `PATCH /api/v1/admin/shops/:id/status` - Suspend or activate a tenant shop.
- `GET /api/v1/admin/metrics` - Platform-wide aggregates (Total shops, total sales volume, active users).
