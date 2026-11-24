import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { BillingPage } from './pages/billing/BillingPage';

// Lazy-load everything outside the core billing flow so the first load
// downloads a much smaller bundle (recharts, zxing, jsbarcode stay out).
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage').then(m => ({ default: m.ProductsPage })));
const AddProductPage = lazy(() => import('./pages/products/AddProductPage').then(m => ({ default: m.AddProductPage })));
const ProductDetailPage = lazy(() => import('./pages/products/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const BulkLabelPage = lazy(() => import('./pages/products/BulkLabelPage').then(m => ({ default: m.BulkLabelPage })));
const CategoriesPage = lazy(() => import('./pages/categories/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SuperAdminPage = lazy(() => import('./pages/admin/SuperAdminPage').then(m => ({ default: m.SuperAdminPage })));
const OnboardingWizardPage = lazy(() => import('./pages/onboarding/OnboardingWizardPage').then(m => ({ default: m.OnboardingWizardPage })));
const HardwarePage = lazy(() => import('./pages/hardware/HardwarePage').then(m => ({ default: m.HardwarePage })));
const KhataDashboardPage = lazy(() => import('./pages/khata/KhataDashboardPage').then(m => ({ default: m.KhataDashboardPage })));
const CustomerLedgerPage = lazy(() => import('./pages/khata/CustomerLedgerPage').then(m => ({ default: m.CustomerLedgerPage })));

const pageFallback = (
  <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs font-semibold">
    Loading...
  </div>
);

function ProtectedRoute({ children }) {
  const { isAuthenticated, isSuperAdmin, activeShop, loading, logout, refreshSession } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs font-semibold">
        Authenticating POS Terminal...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin && activeShop?.status !== 'active') {
    const suspended = activeShop?.status === 'suspended';
    return (
      <main className="min-h-screen grid place-items-center bg-slate-100 p-5">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-medium text-slate-600">{activeShop?.name || 'Store access'}</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {suspended ? 'Your store has been suspended' : 'Your store is unavailable'}
          </h1>
          <p className="mt-3 text-slate-600">Contact the support team to restore access to your store.</p>
          {activeShop?.shopId && <p className="mt-2 text-sm text-slate-600">Store ID {activeShop.shopId}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {activeShop?.supportEmail && <a className="btn btn-primary" href={`mailto:${activeShop.supportEmail}`}>Contact support</a>}
            <button className="btn btn-secondary" onClick={() => refreshSession().catch(() => {})}>Check access</button>
            <button className="btn btn-secondary" onClick={logout}>Sign out</button>
          </div>
        </section>
      </main>
    );
  }

  return children;
}

function AdminRoute({ children }) {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isSuperAdmin) {
    return <Navigate to="/pos" replace />;
  }

  return children;
}

export function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={pageFallback}>
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Onboarding Wizard (Post-registration setup) */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingWizardPage />
                </ProtectedRoute>
              }
            />

            {/* Authenticated Tenant App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/pos" element={<BillingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/new" element={<AddProductPage />} />
              <Route path="/products/labels" element={<BulkLabelPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/khata" element={<KhataDashboardPage />} />
              <Route path="/khata/:customerId" element={<CustomerLedgerPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/hardware" element={<HardwarePage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <SuperAdminPage />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Default Redirection */}
            <Route path="*" element={<Navigate to="/pos" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
