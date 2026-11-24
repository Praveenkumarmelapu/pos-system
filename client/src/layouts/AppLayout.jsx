import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  ReceiptText,
  Users,
  Wallet,
  UserCheck,
  Settings,
  Store,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Zap,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Truck,
  Bell,
  Search,
  Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const NAV_SECTIONS = [
  {
    label: 'MAIN',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/pos', label: 'New Bill', icon: ShoppingCart, highlight: true },
      { to: '/products', label: 'Products', icon: Package },
      { to: '/categories', label: 'Categories', icon: Tag },
      { to: '/inventory', label: 'Inventory', icon: Layers },
      { to: '/reports', label: 'Sales & Returns', icon: ReceiptText },
    ],
  },
  {
    label: 'CUSTOMERS',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/khata', label: 'Khata / Udhaar', icon: Wallet },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { to: '/employees', label: 'Employees', icon: UserCheck },
      { to: '/hardware', label: 'Printers & Scanners', icon: Printer },
      { to: '/settings', label: 'Shop Settings', icon: Settings },
    ],
  },
];

function NavItem({ item, collapsed, cartCount }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all group relative ${
          isActive
            ? 'bg-white/10 text-white font-semibold'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-action rounded-r-full" />
          )}
          <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
          {!collapsed && (
            <span className="truncate">{item.label}</span>
          )}
          {!collapsed && item.highlight && cartCount > 0 && (
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white leading-none">
              {cartCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ user, activeShop, isSuperAdmin, logout, cartCount, collapsed, onClose }) {
  const adminItems = isSuperAdmin
    ? [{ to: '/admin', label: 'Super Admin', icon: ShieldCheck }]
    : [];

  return (
    <div className="flex flex-col h-full bg-nav">
      {/* Brand Header */}
      <div className={`px-4 py-4 border-b border-white/10 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} shrink-0`}>
        <div className="h-9 w-9 rounded-lg bg-action flex items-center justify-center text-white shrink-0 shadow-sm">
          <Store className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">{activeShop?.name || 'Retail POS'}</div>
            <div className="text-[10px] text-slate-500 truncate">{activeShop?.category || 'Store'}</div>
          </div>
        )}
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1 text-slate-400 hover:text-white shrink-0 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5 no-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to + item.label} item={item} collapsed={collapsed} cartCount={cartCount} />
              ))}
            </div>
          </div>
        ))}
        {adminItems.length > 0 && (
          <div>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                PLATFORM
              </p>
            )}
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} cartCount={0} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="px-2 py-3 border-t border-white/10 shrink-0">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-2'}`}>
          <div className="h-8 w-8 rounded-full bg-action/20 text-action text-xs font-bold flex items-center justify-center shrink-0 ring-2 ring-action/30">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-slate-300 truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-600 capitalize">{activeShop?.role || (isSuperAdmin ? 'Platform Admin' : 'Cashier')}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, activeShop, isSuperAdmin, logout } = useAuth();
  const { totals } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isBillingScreen = location.pathname === '/pos';

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-surface text-txt overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 shadow-nav z-20 ${
          collapsed ? 'w-[64px]' : 'w-[230px]'
        }`}
      >
        <SidebarContent
          user={user}
          activeShop={activeShop}
          isSuperAdmin={isSuperAdmin}
          logout={logout}
          cartCount={totals.totalItemsCount}
          collapsed={collapsed}
          onClose={null}
        />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 z-30 hidden lg:flex h-6 w-6 items-center justify-center rounded-full bg-nav border-2 border-surface text-slate-400 hover:text-white transition-colors shadow-md"
          style={{ left: collapsed ? '52px' : '218px' }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-surface-card border-b border-border px-4 sm:px-6 flex items-center justify-between select-none z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-txt-secondary hover:bg-surface-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-txt leading-tight">
                {location.pathname === '/dashboard' && 'Dashboard'}
                {location.pathname === '/pos' && 'Point of Sale'}
                {location.pathname === '/products' && 'Products'}
                {location.pathname === '/inventory' && 'Inventory'}
                {location.pathname === '/customers' && 'Customers'}
                {location.pathname === '/khata' && 'Khata / Udhaar'}
                {location.pathname === '/reports' && 'Reports'}
                {location.pathname === '/employees' && 'Employees'}
                {location.pathname === '/hardware' && 'Hardware Setup'}
                {location.pathname === '/settings' && 'Settings'}
                {location.pathname === '/admin' && 'Super Admin'}
                {!['/dashboard','/pos','/products','/inventory','/customers','/khata','/reports','/employees','/hardware','/settings','/admin'].includes(location.pathname) && 'Retail POS'}
              </h1>
              <p className="text-[11px] text-txt-secondary hidden sm:block">{activeShop?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isBillingScreen && (
              <button
                onClick={() => navigate('/pos')}
                className="btn-primary text-xs py-2 px-3"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>New Bill</span>
                {totals.totalItemsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-nav text-[10px] font-bold leading-none">
                    {totals.totalItemsCount}
                  </span>
                )}
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-txt-secondary bg-surface-muted px-3 py-1.5 rounded-lg border border-border-light">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {user?.name}
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-72 shadow-2xl overflow-y-auto">
              <SidebarContent
                user={user}
                activeShop={activeShop}
                isSuperAdmin={isSuperAdmin}
                logout={logout}
                cartCount={totals.totalItemsCount}
                collapsed={false}
                onClose={() => setMobileMenuOpen(false)}
              />
            </div>
            <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-surface pb-16 lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-card border-t border-border px-1 py-1.5 flex items-center justify-around select-none safe-area-pb">
          {[
            { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
            { to: '/pos', icon: ShoppingCart, label: 'Bill' },
            { to: '/products', icon: Package, label: 'Products' },
            { to: '/khata', icon: Wallet, label: 'Khata' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-action font-bold' : 'text-txt-secondary'
                }`
              }
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {to === '/pos' && totals.totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 rounded-full bg-amber-500 text-[8px] font-bold text-white flex items-center justify-center">
                    {totals.totalItemsCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg text-[10px] font-semibold text-txt-secondary"
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
