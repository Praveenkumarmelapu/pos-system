import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { BillingPage } from './pages/billing/BillingPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { AddProductPage } from './pages/products/AddProductPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { BulkLabelPage } from './pages/products/BulkLabelPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { SuperAdminPage } from './pages/admin/SuperAdminPage';
import { OnboardingWizardPage } from './pages/onboarding/OnboardingWizardPage';
import { HardwarePage } from './pages/hardware/HardwarePage';
import { KhataDashboardPage } from './pages/khata/KhataDashboardPage';
import { CustomerLedgerPage } from './pages/khata/CustomerLedgerPage';

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
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
