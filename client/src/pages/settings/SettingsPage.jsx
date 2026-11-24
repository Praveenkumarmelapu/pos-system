import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Printer, Save, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export function SettingsPage() {
  const { activeShop, refreshSession } = useAuth();
  const [shopName, setShopName] = useState(activeShop?.name ?? '');
  const [gstin, setGstin] = useState(activeShop?.gstin ?? '');
  const [receiptFooter, setReceiptFooter] = useState(activeShop?.settings?.receiptFooter ?? '');
  const [lowStockThreshold, setLowStockThreshold] = useState(String(activeShop?.settings?.lowStockThresholdDefault ?? 5));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await api.patch('/shop/settings', { name: shopName, gstin, receiptFooter, lowStockThreshold: Number(lowStockThreshold) });
      setSaved(true);
      await refreshSession().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Settings could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shop Settings & Receipt Config</h2>
        <p className="text-xs text-slate-500">Configure store branding, GSTIN taxation, and thermal printer header/footer</p>
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {saved && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Shop settings updated successfully!</span>
        </div>
      )}

      {/* Hardware Center Jump Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Printers & Barcode Scanners Setup
            </h4>
            <p className="text-[11px] text-slate-500">
              Configure Bluetooth/USB thermal printers (58mm/80mm), run real test prints, and test barcode scanners
            </p>
          </div>
        </div>

        <Link
          to="/hardware"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <span>Open Hardware Center</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {activeShop?.role !== 'owner' && <p className="text-sm text-slate-600">Only a store owner can update these settings.</p>}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile Card */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-600" />
            <span>Store Profile & Tax Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Display Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Thermal Receipt Customization */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Printer className="h-4 w-4 text-blue-600" />
            <span>Thermal Receipt Customization (58mm / 80mm)</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Footer Message</label>
            <input
              type="text"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Printed at the bottom of customer thermal receipts
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default Low-Stock Threshold</label>
            <input
              type="number" min="0" step="1" required
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-32 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit" disabled={saving || activeShop?.role !== 'owner'}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving…' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
