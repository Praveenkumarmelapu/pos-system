import React from 'react';
import { Outlet } from 'react-router-dom';
import { Store, BarChart3, Shield, Zap, Globe } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex font-sans antialiased">
      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-nav flex-col justify-between p-10 relative overflow-hidden select-none shrink-0">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-action blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-11 w-11 rounded-xl bg-action flex items-center justify-center text-white shadow-lg">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">RetailPOS</h1>
              <p className="text-xs text-slate-500">Cloud Billing Platform</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Modern billing for<br />Indian retail stores
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            Complete POS solution with barcode scanning, inventory management, Khata tracking, and professional reporting.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: Zap, title: 'Fast Billing', desc: 'Scan and bill products in seconds' },
            { icon: BarChart3, title: 'Smart Reports', desc: 'Daily, monthly and payment analytics' },
            { icon: Shield, title: 'Multi-Tenant SaaS', desc: 'Secure isolated data per shop' },
            { icon: Globe, title: 'Works Everywhere', desc: 'Desktop, tablet and mobile ready' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-action" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{title}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-[11px] text-slate-600 mt-8">
          © {new Date().getFullYear()} RetailPOS SaaS Platform
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 bg-surface">
        {/* Mobile brand (shown only on small screens) */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-action flex items-center justify-center text-white shadow-sm">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-txt">RetailPOS</h1>
            <p className="text-[11px] text-txt-secondary">Cloud Billing Platform</p>
          </div>
        </div>

        <div className="w-full max-w-[420px] mx-auto lg:mx-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
