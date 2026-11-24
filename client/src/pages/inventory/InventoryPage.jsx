import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Search,
  Package,
  History,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import { ProductImage } from '../../components/ui/ProductImage';
import { StockBadge } from '../../components/ui/StockBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'movements'
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, low, out

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustType, setAdjustType] = useState('damage');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [movRes, prodRes] = await Promise.all([
        api.get('/inventory/movements?limit=100'),
        api.get('/products?limit=100')
      ]);
      if (movRes.data.success) setMovements(movRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
    } catch (err) {
      console.warn('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const quantityDelta = parseInt(delta, 10);
    if (!quantityDelta || quantityDelta === 0) {
      setError('Please provide a non-zero quantity change (e.g. -2 or +10).');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/inventory/adjust', {
        productId: selectedProductId,
        type: adjustType,
        quantityDelta,
        reason: reason.trim()
      });
      setAdjustModalOpen(false);
      setSelectedProductId('');
      setDelta('');
      setReason('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to adjust stock.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));

    let matchesStatus = true;
    if (filterStatus === 'low') {
      matchesStatus = p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
    } else if (filterStatus === 'out') {
      matchesStatus = p.stockQuantity <= 0;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="touch-controls p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Inventory & Stock Controls</h2>
          <p className="text-xs text-slate-500">
            Real-time shop stock levels, threshold warnings, and auditable movement history
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedProductId('');
              setAdjustModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Record Stock Adjustment</span>
          </button>

          <button
            onClick={loadData}
            className="p-2.5 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 shadow-xs inline-flex items-center justify-center"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Current Stock vs Movement Audit Log */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Current Product Stock ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Stock Movements Audit Log ({movements.length})</span>
        </button>
      </div>

      {/* TAB 1: Current Stock Table */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, brand, or barcode..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  filterStatus === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setFilterStatus('low')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  filterStatus === 'low'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Low Stock
              </button>
              <button
                onClick={() => setFilterStatus('out')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  filterStatus === 'out'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Out of Stock
              </button>
            </div>
          </div>

          {/* Product Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Product Item</th>
                    <th className="px-5 py-3.5">Barcode</th>
                    <th className="px-5 py-3.5 text-center">Available Stock</th>
                    <th className="px-5 py-3.5 text-center">Threshold</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Selling Rate</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                          <ProductImage
                            src={p.imageUrl}
                            alt={p.name}
                            category={p.category}
                            size="sm"
                          />
                        </div>
                        <div className="truncate max-w-xs">
                          <div className="font-bold text-slate-900 truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.brand || p.category} {p.packSize ? `(${p.packSize})` : ''}</div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-slate-600 font-medium">{p.barcode}</td>

                      <td className="px-5 py-3.5 text-center font-extrabold text-sm text-slate-900">
                        {p.stockQuantity} <span className="text-[11px] font-normal text-slate-400">{p.unit}</span>
                      </td>

                      <td className="px-5 py-3.5 text-center text-slate-500 font-medium">
                        {p.minStockThreshold} {p.unit}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <StockBadge
                          quantity={p.stockQuantity}
                          minThreshold={p.minStockThreshold}
                          unit={p.unit}
                        />
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-blue-700">
                        {formatCurrency(p.sellingPrice)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedProductId(p._id);
                            setAdjustModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-xl text-[11px] font-bold text-slate-700 transition-colors"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Immutable Stock Movements Audit Ledger */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Timestamp (IST)</th>
                  <th className="px-5 py-3.5">Barcode</th>
                  <th className="px-5 py-3.5">Movement Type</th>
                  <th className="px-5 py-3.5 text-right">Stock Delta</th>
                  <th className="px-5 py-3.5 text-center">Previous &rarr; New</th>
                  <th className="px-5 py-3.5">Reason / Reference</th>
                  <th className="px-5 py-3.5">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const isNegative = m.quantityDelta < 0;
                  return (
                    <tr key={m._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 font-mono">{formatDate(m.createdAt)}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-800 font-semibold">{m.barcode}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            m.type === 'sale'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : m.type === 'purchase'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 text-right font-extrabold text-sm ${
                        isNegative ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {isNegative ? '' : '+'}{m.quantityDelta}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-600">
                        {m.previousStock} &rarr; <span className="font-bold text-slate-900">{m.newStock}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 truncate max-w-xs font-medium">
                        {m.reason || m.referenceId || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium">
                        {m.performedBy?.name || 'Cashier / Staff'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Stock Adjustment</h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>
            <p className="text-xs text-slate-500">
              All manual additions or deductions will be recorded in the immutable audit ledger.
            </p>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Product Item *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="">-- Choose inventory item --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Stock: {p.stockQuantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reason Type</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="damage">Damage (-)</option>
                    <option value="loss">Loss / Theft (-)</option>
                    <option value="manual_adjustment">Physical Audit (+/-)</option>
                    <option value="return">Customer Return (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity Delta *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. -2 or +10"
                    value={delta}
                    onChange={(e) => setDelta(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Audit Note *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken seal, damaged packaging, tally correction"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {submitting ? 'Updating...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
