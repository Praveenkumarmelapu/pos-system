import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  Search,
  Printer,
  Calendar,
  RefreshCw,
  Eye,
  CheckCircle2,
  DollarSign,
  User,
  ShoppingBag,
  CreditCard,
  MessageCircle,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../services/api';
import { ReceiptModal } from '../../components/ReceiptModal';
import { ReturnModal } from '../../components/ReturnModal';
import { toCsv, downloadCsv } from '../../utils/csv';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

export function ReportsPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [returnSale, setReturnSale] = useState(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices');
  const [gstMonth, setGstMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [gstData, setGstData] = useState(null);
  const [gstLoading, setGstLoading] = useState(false);
  const [gstError, setGstError] = useState('');
  const { activeShop } = useAuth();

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales?limit=100');
      if (res.data.success) {
        setSales(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load sales history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handlePrintReceipt = (sale) => {
    setSelectedSale(sale);
    setReceiptOpen(true);
  };

  const handleReturn = (sale) => {
    setReturnSale(sale);
    setReturnOpen(true);
  };

  const loadGstSummary = async (month) => {
    setGstLoading(true);
    setGstError('');
    try {
      const res = await api.get('/reports/gst-summary', { params: { month } });
      setGstData(res.data.data);
    } catch (err) {
      setGstError(err.response?.data?.error?.message || 'Could not load the GST summary.');
    } finally {
      setGstLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'gst') loadGstSummary(gstMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, gstMonth]);

  const exportSalesCsv = () => {
    const rows = filteredSales;
    if (rows.length === 0) return;
    const csv = toCsv(rows, [
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'saleDate', label: 'Date', value: (s) => formatDate(s.saleDate) },
      { key: 'customerName', label: 'Customer' },
      { key: 'cashierName', label: 'Cashier' },
      { key: 'items', label: 'Items', value: (s) => (s.items || []).reduce((n, i) => n + i.quantity, 0) },
      { key: 'paymentMethod', label: 'Payment Mode' },
      { key: 'subtotal', label: 'Subtotal (Rs)', value: (s) => (s.subtotal / 100).toFixed(2) },
      { key: 'totalDiscount', label: 'Discount (Rs)', value: (s) => (s.totalDiscount / 100).toFixed(2) },
      { key: 'totalTax', label: 'GST (Rs)', value: (s) => (s.totalTax / 100).toFixed(2) },
      { key: 'grandTotal', label: 'Grand Total (Rs)', value: (s) => (s.grandTotal / 100).toFixed(2) },
      { key: 'refundTotal', label: 'Refunded (Rs)', value: (s) => ((s.refundTotal || 0) / 100).toFixed(2) },
      { key: 'status', label: 'Status' }
    ]);
    downloadCsv(`sales-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const exportGstCsv = () => {
    if (!gstData) return;
    const csv = toCsv(gstData.rates, [
      { key: 'taxRate', label: 'GST Rate %' },
      { key: 'taxableValue', label: 'Taxable Value (Rs)', value: (r) => (r.taxableValue / 100).toFixed(2) },
      { key: 'cgst', label: 'CGST (Rs)', value: (r) => (r.cgst / 100).toFixed(2) },
      { key: 'sgst', label: 'SGST (Rs)', value: (r) => (r.sgst / 100).toFixed(2) },
      { key: 'taxAmount', label: 'Total GST (Rs)', value: (r) => (r.taxAmount / 100).toFixed(2) }
    ]);
    downloadCsv(`gst-summary-${gstData.month}.csv`, csv);
  };

  const statusBadge = (s) => {
    if (s.status === 'returned') {
      return <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">Returned</span>;
    }
    if (s.status === 'partially_returned') {
      return <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">Part Return</span>;
    }
    return null;
  };

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      !search.trim() ||
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (s.cashierName && s.cashierName.toLowerCase().includes(search.toLowerCase()));

    const matchesPayment = selectedPayment === 'all' || s.paymentMethod === selectedPayment;

    return matchesSearch && matchesPayment;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sales Invoices & Receipts</h2>
          <p className="text-xs text-slate-500">
            Historical sales transactions, line item snapshots, tax records, and reprint receipts
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'invoices' && (
            <button
              onClick={exportSalesCsv}
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
              title="Download the invoices below as a CSV (Excel) file"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={loadSales}
            className="p-2.5 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 shadow-xs"
            title="Refresh Invoices"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: 'invoices', label: 'Invoices' },
          { id: 'gst', label: 'GST Report' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'gst' && (
        <div className="space-y-4">
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-bold text-slate-600 uppercase">Month</label>
            <input
              type="month"
              value={gstMonth}
              onChange={(e) => e.target.value && setGstMonth(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
            />
            <button
              onClick={exportGstCsv}
              disabled={!gstData || gstLoading}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm sm:ml-auto"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Download GST CSV</span>
            </button>
          </div>

          {gstError && <p role="alert" className="text-xs font-semibold text-red-700">{gstError}</p>}

          {gstLoading ? (
            <p className="text-center py-8 text-slate-400 text-xs">Loading GST summary...</p>
          ) : gstData && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Taxable Value', value: formatCurrency(gstData.totalTaxable), tone: 'text-slate-900' },
                  { label: 'CGST (to Centre)', value: formatCurrency(gstData.cgst), tone: 'text-blue-700' },
                  { label: 'SGST (to State)', value: formatCurrency(gstData.sgst), tone: 'text-purple-700' },
                  { label: 'Total GST Collected', value: formatCurrency(gstData.totalTax), tone: 'text-emerald-700' }
                ].map((card) => (
                  <div key={card.label} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                    <p className={`mt-1 text-lg font-extrabold ${card.tone}`}>{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-bold tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5">GST Rate</th>
                        <th className="px-5 py-3.5 text-right">Taxable Value</th>
                        <th className="px-5 py-3.5 text-right">CGST</th>
                        <th className="px-5 py-3.5 text-right">SGST</th>
                        <th className="px-5 py-3.5 text-right">Total GST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gstData.rates.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-8 text-slate-400">No GST-rated sales in {gstData.month}.</td></tr>
                      ) : (
                        gstData.rates.map((r) => (
                          <tr key={r.taxRate} className="hover:bg-slate-50/70">
                            <td className="px-5 py-3.5 font-bold text-slate-900">{r.taxRate}%</td>
                            <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(r.taxableValue)}</td>
                            <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(r.cgst)}</td>
                            <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(r.sgst)}</td>
                            <td className="px-5 py-3.5 text-right font-extrabold">{formatCurrency(r.taxAmount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="px-5 py-3 text-[10px] text-slate-400 border-t border-slate-100">
                  {gstData.totalBills} bills in {gstData.month}. Returns are netted out ({formatCurrency(gstData.totalRefunds)} refunded). Bill-level discounts are not allocated per rate.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filter Bar */}
      {activeTab === 'invoices' && (<>
      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, customer, or cashier..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash Only</option>
            <option value="upi">UPI / QR Only</option>
            <option value="card">Card Only</option>
            <option value="credit">Udhaar / Credit</option>
          </select>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Invoice #</th>
                <th className="px-5 py-3.5">Date & Time (IST)</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5 text-right">Tax (GST)</th>
                <th className="px-5 py-3.5 text-right">Grand Total</th>
                <th className="px-5 py-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">Loading sales records...</td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">No invoices matching criteria.</td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600 text-sm">
                      {s.invoiceNumber}
                      {statusBadge(s)}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {formatDate(s.saleDate)}
                    </td>

                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {s.customerName}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      <span className="font-semibold text-slate-800">{s.items?.length || 0}</span> products
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {s.paymentMethod}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right font-medium text-slate-500">
                      {formatCurrency(s.totalTax)}
                    </td>

                    <td className="px-5 py-3.5 text-right font-extrabold text-sm text-slate-900">
                      {formatCurrency(s.grandTotal)}
                      {s.refundTotal > 0 && (
                        <div className="text-[10px] font-semibold text-rose-600">-{formatCurrency(s.refundTotal)} refunded</div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePrintReceipt(s)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 rounded-xl transition-colors shadow-xs flex items-center justify-center shrink-0"
                          title="Share Bill via WhatsApp"
                          aria-label="Share Bill via WhatsApp"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(s)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print Bill</span>
                        </button>
                        {s.status !== 'returned' && s.status !== 'cancelled' && (
                          <button
                            onClick={() => handleReturn(s)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                            title="Return / refund items from this bill"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Return</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      </>)}

      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        sale={selectedSale}
        shop={activeShop}
      />
      <ReturnModal
        isOpen={returnOpen}
        onClose={() => setReturnOpen(false)}
        sale={returnSale}
        shop={activeShop}
        onReturned={() => loadSales()}
      />
    </div>
  );
}
