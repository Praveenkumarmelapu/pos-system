# Multi-Tenant Retail POS SaaS - Phased Implementation Plan

## Phase 1: Architecture & Workspace Setup
- [x] Inspect environment and verify Node.js, npm, MongoDB availability.
- [x] System Architecture document (`docs/architecture.md`).
- [x] Database Design & Schema specification (`docs/database-design.md`).
- [x] API Specification (`docs/api-specification.md`).
- [x] Technical Risks & Mitigation document (`docs/development-plan.md`).
- [ ] Initialize Root monorepo configuration (`package.json`, `.gitignore`).
- [ ] Scaffold Backend project structure (`server/`).
- [ ] Scaffold Frontend project structure (`client/`).

## Phase 2: Core Backend Engine & Multi-Tenant Foundations
- [ ] Implement Express server with security middleware (Helmet, CORS, Rate Limit, Error handling).
- [ ] Setup MongoDB connection with Mongoose.
- [ ] Build Models: Shop, User, Membership, Product, MasterProduct, Sale, StockMovement, Customer.
- [ ] Build Authentication & Tenant Context Middleware (`authGuard`, `tenantContext`, `roleGuard`).
- [ ] Implement Auth Controllers (`/api/v1/auth/register-shop`, `/api/v1/auth/login`, `/api/v1/auth/me`).
- [ ] Seed script for demo shop, users, and verified Indian Master Products catalog.
- [ ] Unit & Integration tests for Tenant Isolation and Auth.

## Phase 3: Smart Barcode Integration & External Catalog
- [ ] Build Barcode Lookup Service (Shop DB -> Master Catalog -> Open Food Facts API fallback).
- [ ] Test barcode normalization (EAN-13, UPC-A, Code 128).
- [ ] Implement Product CRUD endpoints with tenant scoping and barcode unique validation.
- [ ] Internal barcode generator for non-barcoded loose goods (kirana staples).

## Phase 4: Frontend Application Foundation & UI Framework
- [ ] Setup Tailwind CSS with clean, enterprise SaaS design palette (custom typography, badge components, subtle cards).
- [ ] React Router structure with Protected Routes (Public Auth, Shop App, Super Admin).
- [ ] Auth & Tenant State Management (React Context + TanStack Query).
- [ ] Navigation shell (Sidebar, Topbar with active shop switcher, cashier status, notification bell).
- [ ] Shop Registration & Onboarding wizard (Shop details, GSTIN, business category).
- [ ] Modern Login view with demo credentials switch.

## Phase 5: High-Speed POS Billing Module
- [ ] Billing screen layout: Dual-pane desktop (Scanner/Search on left, Cart & Totals on right) and responsive mobile view.
- [ ] Hardware Barcode Scanner listener (captures rapid keyboard buffer inputs terminating with Enter).
- [ ] Mobile Camera Scanner integration using `@zxing/browser` with camera switch, torch toggle, and scan beep sound.
- [ ] Quick-add product drawer for unregistered barcodes encountered during billing.
- [ ] Cart management: quantity modifiers, item discount, bill discount, GST auto-calculation.
- [ ] Checkout modal: Cash with tendered/change calculator, UPI QR code display & ref recording, Card, Credit.
- [ ] Thermal Receipt modal (58mm and 80mm preview, print CSS formatting).

## Phase 6: Product & Inventory Management
- [ ] Product catalog table with filters (category, low stock, out of stock, search).
- [ ] Add/Edit Product modal with smart barcode lookup preview.
- [ ] Stock adjustments view (damage, loss, manual tally) generating auditable Stock Movements.
- [ ] Stock inward / Purchases intake form.

## Phase 7: Analytics, Customer Management & Super Admin
- [ ] Shop Dashboard: Today's revenue, transaction count, average bill, low stock alerts, weekly sales chart (Recharts).
- [ ] Sales History table with receipt re-print and refund handling.
- [ ] Customer directory with purchase history and Udhaar/Credit balance tracking.
- [ ] Super Admin Dashboard: Platform metrics, shop listing, suspension toggle.

## Phase 8: Testing, Verification & Production Readiness
- [ ] Backend API automated tests (Jest/Supertest or Vitest) verifying:
  - Auth registration and login
  - Strict cross-tenant data isolation
  - Atomic stock deduction and duplicate checkout prevention
  - Barcode lookup fallback
- [ ] Frontend production build test (`npm run build`).
- [ ] Full End-to-End manual testing across desktop and simulated mobile viewports.
- [ ] Comprehensive README with setup commands, architecture review, and developer guide.
