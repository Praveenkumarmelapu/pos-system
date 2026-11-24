import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import {
  ArrowLeft,
  Printer,
  Edit,
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
  History,
  Tag,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ProductImage } from '../../components/ui/ProductImage';
import { StockBadge } from '../../components/ui/StockBadge';
import { MetricCard } from '../../components/ui/MetricCard';
const BarcodeLabelModal = lazy(() => import('../../components/BarcodeLabelModal').then(m => ({ default: m.BarcodeLabelModal })));
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Adjustments
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState('manual_adjustment');
  const [adjustDelta, setAdjustDelta] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const barcodeSvgRef = useRef(null);

  const loadProductDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/products/${id}`);
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load product detail', err);
      setError('Product not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductDetail();
  }, [id]);

  const product = data?.product;
  const recentMovements = data?.recentMovements || [];
  const recentSales = data?.recentSales || [];
  const analytics = data?.analytics || { totalUnitsSold: 0, totalRevenuePaise: 0 };

  // Render Barcode
  useEffect(() => {
    if (!product?.barcode || !barcodeSvgRef.current) return;
    try {
      JsBarcode(barcodeSvgRef.current, product.barcode, {
        format: 'CODE128',
        width: 1.6,
        height: 48,
        displayValue: true,
        fontSize: 12,
        font: 'monospace',
        fontOptions: 'bold',
        textMargin: 2,
        margin: 4,
        background: '#ffffff',
        lineColor: '#0f172a'
      });
    } catch (e) {
      console.error('Barcode render error', e);
    }
  }, [product?.barcode]);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustReason.trim()) {
      alert('Please provide an audit reason for the adjustment.');
      return;
    }

    setSubmittingAdjust(true);
    try {
      const deltaNumber = parseFloat(adjustDelta);
      await api.post('/inventory/adjust', {
        productId: product._id,
        type: adjustType,
        quantityDelta: deltaNumber,
        reason: adjustReason
      });

      setAdjustModalOpen(false);
      setAdjustReason('');
      setAdjustDelta(1);
      await loadProductDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to adjust stock');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton count={3} />
        <LoadingSkeleton count={5} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 mb-1">{error || 'Product not found'}</h3>
        <p className="text-xs text-slate-500 mb-6">The requested product may have been deleted or archived.</p>
        <Link
          to="/products"
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700"
        >
          Back to Products Catalog
        </Link>
      </div>
    );
  }

  // Margin calculation
  const marginPaise = product.sellingPrice - (product.purchasePrice || 0);
  const marginPercent = product.sellingPrice > 0 ? ((marginPaise / product.sellingPrice) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header with Navigation & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {product.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {product.category || 'General'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Barcode: <span className="font-bold text-slate-700">{product.barcode}</span>
              {product.brand && ` • Brand: ${product.brand}`}
              {product.packSize && ` • Pack: ${product.packSize}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAdjustModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>Adjust Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setLabelModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print Label</span>
          </button>
        </div>
      </div>

      {/* Primary Product Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Stock Available"
          value={`${product.stockQuantity} ${product.unit}`}
          subtitle={
            product.stockQuantity <= product.minStockThreshold ? 'Low stock threshold reached' : 'Healthy inventory'
          }
          icon={Package}
          color={product.stockQuantity <= product.minStockThreshold ? 'amber' : 'emerald'}
        />

        <MetricCard
          title="Selling Price"
          value={formatCurrency(product.sellingPrice)}
          subtitle={product.mrp > product.sellingPrice ? `MRP: ${formatCurrency(product.mrp)}` : 'At or below MRP'}
          icon={DollarSign}
          color="blue"
        />

        <MetricCard
          title="Profit Margin"
          value={`${formatCurrency(marginPaise)}`}
          subtitle={`${marginPercent}% margin per unit`}
          icon={TrendingUp}
          color="indigo"
        />

        <MetricCard
          title="Total Units Sold"
          value={`${analytics.totalUnitsSold} ${product.unit}`}
          subtitle={`Revenue: ${formatCurrency(analytics.totalRevenuePaise)}`}
          icon={CheckCircle2}
          color="teal"
        />
      </div>

      {/* Main Details: Imagery, Pricing & Barcode Artwork */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image & Barcode Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Product Image
            </h3>
            <div className="h-56 w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                category={product.category}
                size="xl"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Code 128 Barcode</span>
              <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => setLabelModalOpen(true)}>
                Print Sticker
              </span>
            </h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center">
              <svg ref={barcodeSvgRef} className="max-w-full" />
              <p className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                {product.barcode}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">GST Tax Rate</span>
              <span className="font-bold text-slate-900">{product.taxRate || 0}%</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">Purchase Cost</span>
              <span className="font-bold text-slate-900">{formatCurrency(product.purchasePrice || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">Min Threshold</span>
              <span className="font-bold text-slate-900">{product.minStockThreshold} {product.unit}</span>
            </div>
          </div>
        </div>

        {/* Right Columns: Audit Trail & Sales History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock Movement Audit Ledger */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Stock Movements Audit Trail
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Last {recentMovements.length} events
              </span>
            </div>

            {recentMovements.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No stock movement events recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Delta</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3">Reason / Ref</th>
                      <th className="py-2.5 px-3">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentMovements.map((m) => (
                      <tr key={m._id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            m.type === 'sale'
                              ? 'bg-blue-50 text-blue-700'
                              : m.type === 'purchase'
                              ? 'bg-emerald-50 text-emerald-700'
                              : m.type === 'damage'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {m.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-extrabold ${
                          m.quantityDelta > 0 ? 'text-emerald-600' : 'text-slate-700'
                        }`}>
                          {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta} {product.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {m.newStock}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate" title={m.reason}>
                          {m.reason || m.referenceId || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {m.performedBy?.name || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Sales Invoices */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Recent Sales Records
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Last {recentSales.length} bills
              </span>
            </div>

            {recentSales.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent billing transactions found for this product.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Qty Billed</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentSales.map((s) => {
                      const item = s.items.find(i => i.productId.toString() === product._id.toString());
                      return (
                        <tr key={s._id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                            {s.invoiceNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            {s.customerName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {formatDateTime(s.createdAt)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                            {item?.quantity || 1} {product.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                            {formatCurrency(item?.lineTotal || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Adjust Product Stock</h3>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800"
                >
                  <option value="manual_adjustment">Manual Stock Audit (+ / -)</option>
                  <option value="damage">Damaged Goods (-)</option>
                  <option value="loss">Loss / Expiry (-)</option>
                  <option value="return">Customer Return (+)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Quantity Delta ({product.unit})
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  Use negative numbers to reduce stock (e.g. -2) or positive to add (e.g. 5 or 1.5).
                </p>
                <input
                  type="number"
                  step="any"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  required
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Audit Reason *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory count correction"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
                >
                  {submittingAdjust ? 'Updating...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Label Modal */}
      {labelModalOpen && (
        <Suspense fallback={null}>
          <BarcodeLabelModal
            isOpen={labelModalOpen}
            onClose={() => setLabelModalOpen(false)}
            product={product}
          />
        </Suspense>
      )}
    </div>
  );
}
