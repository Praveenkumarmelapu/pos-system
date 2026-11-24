import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowRight,
  Wallet,
  Plus,
  RefreshCw,
  CheckCircle,
  BarChart3,
  Clock,
  Banknote,
  QrCode,
  BookOpen,
  Receipt
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { SalesChart } from '../../components/ui/SalesChart';
import { formatCurrency } from '../../utils/formatters';

// Clean Commercial KPI Card
function KPICard({ label, value, sub, icon: Icon, trend, to = '/reports' }) {
  return (
    <Link to={to} className="group min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-600 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-blue-700" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold tracking-tight tabular-nums text-slate-900 sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{sub}</p>
      {trend != null && <p className={`mt-1 text-xs font-semibold ${trend >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
        {trend >= 0 ? '+' : '−'}{Math.abs(trend).toFixed(1)}% vs yesterday
      </p>}
    </Link>
  );
}

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [khata, setKhata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(7);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [restockModal, setRestockModal] = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [submittingRestock, setSubmittingRestock] = useState(false);

  // Payment Breakdown Range State
  const [paymentRange, setPaymentRange] = useState('today'); // 'today' | 'yesterday' | '7d' | 'month' | 'all'
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [loadingPaymentRange, setLoadingPaymentRange] = useState(false);
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('all'); // 'all' | 'cash' | 'upi' | 'credit'

  const { activeShop } = useAuth();
  const [loadError, setLoadError] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const paymentRequest = useRef(0);

  // Load Main Dashboard Data
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [statsRes, trendsRes, khataRes, salesRes, productsRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get(`/reports/sales-trends?days=${trendDays}`),
        api.get('/khata/summary').catch(() => ({ data: { success: false } })),
        api.get('/sales?limit=12&page=1'),
        api.get('/products?status=low_stock&limit=6'),
      ]);

      if (statsRes.data.success) {
        setData(statsRes.data.data);
        if (statsRes.data.data.paymentBreakdown) {
          setPaymentSummary(previous => previous ?? statsRes.data.data.paymentBreakdown);
        }
      }
      if (trendsRes.data.success) setTrends(trendsRes.data.data);
      if (khataRes.data.success) setKhata(khataRes.data.data);
      if (salesRes.data.success) setRecentSales(salesRes.data.data);
      if (productsRes.data.success) {
        const all = productsRes.data.data;
        setLowStock(all);
      }
    } catch (err) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [trendDays]);

  useEffect(() => { load(); }, [load]);

  // Load Payment Breakdown when range changes
  const handlePaymentRangeChange = async (range) => {
    const request = ++paymentRequest.current;
    setPaymentRange(range);
    setLoadingPaymentRange(true);
    setPaymentError(false);
    setPaymentSummary(null);
    try {
      const res = await api.get(`/reports/payment-summary?range=${range}`);
      if (request === paymentRequest.current && res.data.success) {
        setPaymentSummary(res.data.data);
      }
    } catch (err) {
      if (request === paymentRequest.current) setPaymentError(true);
    } finally {
      if (request === paymentRequest.current) setLoadingPaymentRange(false);
    }
  };

  // Quick Restock
  const handleRestock = async (e) => {
    e.preventDefault();
    if (!restockModal) return;
    setSubmittingRestock(true);
    try {
      await api.post('/inventory/adjust', {
        productId: restockModal._id,
        type: 'manual_adjustment',
        quantityDelta: parseFloat(restockQty) || 0,
        reason: 'Dashboard quick restock'
      });
      setRestockModal(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update stock');
    } finally {
      setSubmittingRestock(false);
    }
  };

  const kpis = data?.kpis || {};
  const topSelling = data?.topSellingProducts || [];

  // Calculate trend %
  const salesTrend = kpis.yesterdaySales > 0
    ? ((kpis.todaySales - kpis.yesterdaySales) / kpis.yesterdaySales) * 100
    : null;

  // Filter recent transactions by payment method if selected
  const filteredSales = useMemo(() => {
    if (selectedPaymentFilter === 'all') return recentSales;
    return recentSales.filter(sale => {
      const method = (sale.paymentMethod || '').toLowerCase();
      if (selectedPaymentFilter === 'cash') return method === 'cash' || (sale.paymentBreakdown?.cash > 0);
      if (selectedPaymentFilter === 'upi') return method === 'upi' || (sale.paymentBreakdown?.upi > 0);
      if (selectedPaymentFilter === 'credit') return method === 'credit' || sale.creditAmount > 0 || (sale.paymentBreakdown?.credit > 0);
      return true;
    });
  }, [recentSales, selectedPaymentFilter]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-txt-secondary text-sm p-12">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-3 border-action border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-txt">Loading store overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <header className="flex flex-col gap-5 rounded-2xl bg-slate-900 p-5 text-white sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="text-sm text-slate-300">Store dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{activeShop?.name || 'Store overview'}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'Asia/Kolkata' }).format(new Date())}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={load} className="btn btn-secondary">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Link to="/products/new" className="btn btn-secondary"><Plus className="h-4 w-4" /> Add product</Link>
          <Link to="/pos" className="btn btn-primary"><ShoppingBag className="h-4 w-4" /> New bill</Link>
        </div>
      </header>

      {loadError ? (
        <div role="alert" className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <p>Dashboard data could not load. Try refreshing.</p>
          <button type="button" onClick={load} className="btn btn-secondary">Retry</button>
        </div>
      ) : <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KPICard
          label="Sales today"
          value={formatCurrency(kpis.todaySales)}
          sub={`vs ${formatCurrency(kpis.yesterdaySales)} yesterday`}
          icon={TrendingUp}
          trend={salesTrend}
        />
        <KPICard
          label="Bills today"
          value={kpis.todayBillsCount || 0}
          sub={`Avg: ${formatCurrency(kpis.averageBillValue)}`}
          icon={ShoppingBag}
        />
        <KPICard
          label="Sales this month"
          value={formatCurrency(kpis.monthSales)}
          sub="Month-to-date"
          icon={BarChart3}
        />
        <KPICard
          label="Estimated Profit"
          value={formatCurrency(kpis.estimatedGrossProfitToday)}
          sub="Today gross profit"
          icon={TrendingUp}
        />
        <KPICard
          label="Khata due"
          to="/khata"
          value={khata ? formatCurrency(khata.totalOutstandingPaise) : "—"}
          sub={khata ? `${khata.debtorCount || 0} open accounts` : "Balance unavailable"}
          icon={Wallet}
        />
        <KPICard
          label="Stock alerts"
          to="/inventory"
          value={kpis.lowStockProducts || 0}
          sub={`${kpis.outOfStockProducts || 0} out of stock`}
          icon={AlertTriangle}
        />
      </div>

      {/* ========================================================================= */}
      {/* SALES CHART SECTION: BAR VIEW / DUAL COMBO / WAVE AREA                    */}
      {/* ========================================================================= */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-txt">Sales trend</h3>
            <p className="text-xs text-txt-secondary mt-0.5">Daily revenue and transaction frequency (IST)</p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-xs text-txt-secondary font-medium mr-1 hidden sm:inline">Timeframe:</span>
            {[
              { label: '7 Days', value: 7 },
              { label: '14 Days', value: 14 },
              { label: '30 Days', value: 30 },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTrendDays(opt.value)}
                aria-pressed={trendDays === opt.value}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  trendDays === opt.value
                    ? 'bg-action text-white shadow-xs font-bold'
                    : 'bg-surface-muted text-txt-secondary hover:text-txt border border-border'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upgraded Multi-Style SalesChart */}
        <SalesChart data={trends} />
      </div>

      {/* ========================================================================= */}
      {/* PAYMENT COLLECTIONS HUB: UPI, CASH & KHATA CREDIT BREAKDOWN              */}
      {/* ========================================================================= */}
      <div className="card p-4 sm:p-5 space-y-4">
        {loadingPaymentRange && <p role="status" className="text-sm text-slate-600">Loading payment totals…</p>}
        {paymentError && <p role="alert" className="text-sm text-red-700">Payment totals could not load for this range.</p>}

        {/* Section Header with Time-Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-txt">
              Payment Collections Breakdown
            </h2>
            <p className="text-xs text-txt-secondary mt-0.5">
              Net settlement amounts across digital UPI, register cash, and customer store credit.
            </p>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg border border-border shrink-0 self-start sm:self-auto">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7d', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handlePaymentRangeChange(tab.id)}
                aria-pressed={paymentRange === tab.id}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  paymentRange === tab.id
                    ? 'bg-action text-white shadow-xs font-bold'
                    : 'text-txt-secondary hover:text-txt'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Interactive Payment Channel Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. UPI COLLECTIONS CARD */}
          <div
            onClick={() => setSelectedPaymentFilter(selectedPaymentFilter === 'upi' ? 'all' : 'upi')}
            className={`p-4 rounded-lg border transition-all cursor-pointer select-none relative overflow-hidden ${
              selectedPaymentFilter === 'upi'
                ? 'bg-blue-50/50 border-action ring-2 ring-action/20 shadow-xs'
                : 'bg-surface-card hover:bg-surface-muted border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-action flex items-center justify-center">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-txt block">UPI / QR Code</span>
                  <span className="text-[10px] text-txt-muted">PhonePe, GPay, Paytm</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-action">
                {paymentSummary?.upi?.percentage || 0}%
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-bold text-txt tracking-tight font-mono">
                {formatCurrency(paymentSummary?.upi?.amount || 0)}
              </div>
              <div className="flex items-center justify-between text-xs text-txt-secondary mt-1">
                <span>{paymentSummary?.upi?.count || 0} transactions</span>
                <span className="text-action font-semibold">
                  {selectedPaymentFilter === 'upi' ? 'Active filter' : 'Filter &rarr;'}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-action h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, paymentSummary?.upi?.percentage || 0)}%` }}
              />
            </div>
          </div>

          {/* 2. CASH IN HAND CARD */}
          <div
            onClick={() => setSelectedPaymentFilter(selectedPaymentFilter === 'cash' ? 'all' : 'cash')}
            className={`p-4 rounded-lg border transition-all cursor-pointer select-none relative overflow-hidden ${
              selectedPaymentFilter === 'cash'
                ? 'bg-green-50/50 border-success ring-2 ring-success/20 shadow-xs'
                : 'bg-surface-card hover:bg-surface-muted border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-100 text-success flex items-center justify-center">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-txt block">Cash in Drawer</span>
                  <span className="text-[10px] text-txt-muted">Physical currency</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-success">
                {paymentSummary?.cash?.percentage || 0}%
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-bold text-txt tracking-tight font-mono">
                {formatCurrency(paymentSummary?.cash?.amount || 0)}
              </div>
              <div className="flex items-center justify-between text-xs text-txt-secondary mt-1">
                <span>{paymentSummary?.cash?.count || 0} bills</span>
                <span className="text-success font-semibold">
                  {selectedPaymentFilter === 'cash' ? 'Active filter' : 'Filter &rarr;'}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-success h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, paymentSummary?.cash?.percentage || 0)}%` }}
              />
            </div>
          </div>

          {/* 3. KHATA / UDHAAR CREDIT CARD */}
          <div
            onClick={() => setSelectedPaymentFilter(selectedPaymentFilter === 'credit' ? 'all' : 'credit')}
            className={`p-4 rounded-lg border transition-all cursor-pointer select-none relative overflow-hidden ${
              selectedPaymentFilter === 'credit'
                ? 'bg-amber-50/50 border-warning ring-2 ring-warning/20 shadow-xs'
                : 'bg-surface-card hover:bg-surface-muted border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-warning flex items-center justify-center">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-txt block">Khata / Credit</span>
                  <span className="text-[10px] text-txt-muted">Customer store credit</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-warning">
                {paymentSummary?.credit?.percentage || 0}%
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-bold text-txt tracking-tight font-mono">
                {formatCurrency(paymentSummary?.credit?.amount || 0)}
              </div>
              <div className="flex items-center justify-between text-xs text-txt-secondary mt-1">
                <span>{paymentSummary?.credit?.count || 0} credit bills</span>
                <span className="text-warning font-semibold">
                  {selectedPaymentFilter === 'credit' ? 'Active filter' : 'Filter &rarr;'}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-warning h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, paymentSummary?.credit?.percentage || 0)}%` }}
              />
            </div>
          </div>

          {/* 4. TOTAL COLLECTIONS SUMMARY */}
          <div className="p-4 rounded-lg border border-border bg-surface-muted select-none flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-nav text-white flex items-center justify-center">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-txt block">Total In Period</span>
                    <span className="text-[10px] text-txt-muted">Gross collections</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-card border border-border text-txt-secondary uppercase">
                  {paymentRange}
                </span>
              </div>

              <div className="mt-2">
                <div className="text-2xl font-bold text-txt tracking-tight font-mono">
                  {formatCurrency(paymentSummary?.totalSales || 0)}
                </div>
                <div className="text-xs text-txt-secondary mt-1">
                  {paymentSummary?.totalBills || 0} completed transactions
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs">
              <Link to="/reports" className="text-action font-semibold hover:underline flex items-center gap-1">
                <span>Detailed Reports</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link to="/khata" className="text-warning font-semibold hover:underline">
                Open Khata &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM ROW: TOP SELLERS, STOCK ALERTS & DRILL-DOWN TRANSACTIONS          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Sellers Panel */}
        <div className="card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <h3 className="section-heading flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-action" />
                <span>Top Selling Products</span>
              </h3>
              <Link to="/products" className="text-xs text-action font-semibold hover:underline">
                Catalog
              </Link>
            </div>

            <div className="space-y-2">
              {topSelling.length === 0 ? (
                <p className="text-xs text-txt-muted py-6 text-center">No sales data recorded yet</p>
              ) : (
                topSelling.slice(0, 5).map((p, i) => (
                  <div key={p._id || i} className="flex items-center gap-2.5 py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-xs font-bold text-txt-muted w-5 shrink-0 text-right">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-txt truncate">{p.name}</div>
                      <div className="text-[10px] text-txt-secondary">{p.totalUnitsSold} {p.unit || 'units'} sold</div>
                    </div>
                    <span className="text-xs font-bold text-txt font-mono shrink-0">{formatCurrency(p.totalRevenue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border mt-3">
            <Link to="/reports" className="text-xs font-semibold text-action hover:underline flex items-center justify-between">
              <span>View full sales reporting</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <h3 className="section-heading flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>Inventory Alerts</span>
              </h3>
              <Link to="/inventory" className="text-xs text-action font-semibold hover:underline">
                Manage
              </Link>
            </div>

            {lowStock.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <CheckCircle className="h-7 w-7 text-success mx-auto" />
                <p className="text-xs text-txt font-semibold">Stock levels healthy</p>
                <p className="text-[11px] text-txt-muted">All tracked items are above minimum threshold</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStock.map(p => (
                  <div key={p._id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-txt truncate">{p.name}</div>
                      <div className="text-[10px] text-warning font-mono font-medium">Stock: {p.stockQuantity} {p.unit} remaining</div>
                    </div>
                    <button
                      onClick={() => { setRestockModal(p); setRestockQty(10); }}
                      className="shrink-0 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-action hover:bg-blue-100 border border-blue-200 rounded-md flex items-center gap-1 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Restock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border mt-3">
            <Link to="/inventory" className="text-xs font-semibold text-action hover:underline flex items-center justify-between">
              <span>Stock movement ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Drill-down Transactions */}
        <div className="card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <div>
                <h3 className="section-heading flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-txt-secondary" />
                  <span>Recent Bills</span>
                </h3>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1">
                {['all', 'cash', 'upi', 'credit'].map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedPaymentFilter(f)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                      selectedPaymentFilter === f
                        ? 'bg-nav text-white'
                        : 'bg-surface-muted text-txt-secondary hover:text-txt border border-border'
                    }`}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {filteredSales.length === 0 ? (
                <p className="text-xs text-txt-muted py-6 text-center">
                  No {selectedPaymentFilter !== 'all' ? `${selectedPaymentFilter.toUpperCase()} ` : ''}sales recorded yet today
                </p>
              ) : (
                filteredSales.slice(0, 6).map(sale => {
                  const method = (sale.paymentMethod || 'cash').toLowerCase();
                  return (
                    <div key={sale._id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-txt font-mono">{sale.invoiceNumber}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              method === 'upi'
                                ? 'bg-blue-50 text-action border border-blue-200'
                                : method === 'credit'
                                ? 'bg-amber-50 text-warning border border-amber-200'
                                : 'bg-green-50 text-success border border-green-200'
                            }`}
                          >
                            {method}
                          </span>
                        </div>
                        <div className="text-[10px] text-txt-secondary truncate mt-0.5">
                          {sale.customerName || 'Walk-in Customer'}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-txt font-mono shrink-0">
                        {formatCurrency(sale.grandTotal)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border mt-3">
            <Link to="/reports" className="text-xs font-semibold text-action hover:underline flex items-center justify-between">
              <span>All invoices & returns</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Restock Modal */}
      {restockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
          <div className="card max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-txt">Quick Restock</h3>
              <p className="text-xs text-txt-secondary mt-0.5">{restockModal.name}</p>
              <p className="text-xs text-txt-muted mt-1">Current Stock: <strong className="text-txt">{restockModal.stockQuantity} {restockModal.unit}</strong></p>
            </div>
            <form onSubmit={handleRestock} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-txt mb-1">
                  Quantity to Add ({restockModal.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  className="input"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModal(null)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRestock}
                  className="btn btn-primary text-xs"
                >
                  {submittingRestock ? 'Saving...' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
