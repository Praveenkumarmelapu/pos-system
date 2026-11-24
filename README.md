# POS SYSTEM - Multi-Tenant Retail POS, Billing & Inventory Management SaaS

A production-grade, multi-tenant cloud POS, billing, and inventory management platform designed specifically for Indian retail shops (Kirana stores, grocery shops, stationery, cosmetics, and small supermarkets).

## Key Capabilities
- **True Multi-Tenancy**: Logical data isolation across all collections using tenant-scoped compound indexes and verified server-side tenant contexts.
- **Smart Barcode Engine**:
  - Hardware USB/Bluetooth HID scanner input listener with keyboard debounce and Enter-suffix handling.
  - Mobile camera scanner powered by `@zxing/browser` with camera switching and sound feedback.
  - Cascading 3-tier lookup: Shop Inventory -> Platform Master Catalog -> Open Food Facts fallback.
- **High-Velocity POS Checkout**:
  - Dual-pane desktop layout and touch-optimized low-latency mobile single-column layout.
  - Atomic stock deductions and Idempotency Keys preventing duplicate billing.
  - Multiple payment recording: Cash (tendered & change calculator), UPI (QR display & reference note), Card, Udhaar/Credit.
  - Thermal receipt printing (58mm and 80mm ESC/POS compatible CSS print media) & standard invoices.
- **Inventory & Stock Management**:
  - Opening stock, stock inward purchase entry, manual adjustments with auditable stock movements ledger.
  - Real-time low-stock and out-of-stock triggers.
  - Custom internal barcode generation for non-barcoded commodities.
- **Sales Analytics & Reports**:
  - Real-time KPIs: Today's sales, Monthly sales, average bill, top-selling items.
  - Asia/Kolkata timezone normalization.
- **Super Admin Dashboard**:
  - Platform metrics, tenant onboarding oversight, shop suspension and subscription tier management.

## Architecture Documentation
- [System Architecture](docs/architecture.md)
- [Database Design](docs/database-design.md)
- [API Specification](docs/api-specification.md)
- [Development Plan](docs/development-plan.md)

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, TanStack Query, React Router, Recharts, Zod.
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, JWT, Argon2/Bcrypt, Zod.
- **Scanning**: `@zxing/browser` + HID Barcode stream parser.

## Run locally

1. Copy `server/.env.example` to `server/.env` and set your MongoDB connection and JWT secret. Set `POS_SUPPORT_EMAIL` to the address customers should use when their store is suspended.
2. From the project root, run `npm ci` and `npm run dev`. Open the frontend URL shown by Vite.
3. Use `npm run build` for a frontend production build. Set `MONGODB_URI` to a dedicated test database before running `npm run test:server`.

When adding a product, enter the barcode and press Enter, use a keyboard-wedge scanner with an Enter suffix, or use the camera on HTTPS or localhost. Review any catalog price against the packaging. If the product or its price is missing from the catalog, enter those details and save them to your store. Future scans of that barcode use your store's saved selling price.

Super Admin can suspend or reactivate a shop from the platform dashboard. Suspended shops retain their records and display the support screen on login. After reactivation, the owner can use Check access to reopen the shop. Shop access is managed by Super Admin.
