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
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveDate, setArchiveDate] = useState('');
  const [archivePreview, setArchivePreview] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [archiveMessage, setArchiveMessage] = useState('');
  const [archiveFileReady, setArchiveFileReady] = useState(false);
  const [archiveBackupConfirmed, setArchiveBackupConfirmed] = useState(false);
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

  const exportAllBillsAndPrepareClear = async () => {
    setArchiveLoading(true);
    setArchiveError('');
    setArchiveMessage('');
    setArchiveFileReady(false);
    setArchiveBackupConfirmed(false);
    try {
      const preview = await api.get('/sales/archive/preview', { params: { beforeDate: archiveDate } }).then((response) => response.data.data);
      const allBills = [];
      let exportToken = null;
      let after = null;
      let summary = preview;
      while (true) {
        const response = await api.post('/sales/archive/export', after
          ? { exportToken, after }
          : { beforeDate: archiveDate });
        const data = response.data.data;
        summary = data;
        exportToken = data.exportToken;
        allBills.push(...data.records);
        after = data.after;
        if (!data.hasMore) break;
        if (!after) throw new Error('Export paging stopped unexpectedly. No file was prepared for clearing.');
      }
      if (summary.totalAll !== preview.totalAll || summary.totalOld !== preview.total || summary.eligible !== preview.eligible || summary.protected !== preview.protected) {
        throw new Error('Bills changed since the preview. No file was prepared for clearing. Refresh the preview and try again.');
      }
      const unique = new Set(allBills.map((bill) => String(bill._id)));
      const hasOutOfScopeRow = allBills.some((bill) => bill.shopId !== summary.shopId);
      if (unique.size !== allBills.length || hasOutOfScopeRow || allBills.length !== summary.totalAll) {
        throw new Error(`Export verification failed. Expected ${summary.totalAll} bills and found ${unique.size} unique in-scope rows. Nothing was cleared.`);
      }
      const columns = [
        { key: '_id', label: 'Sale ID' }, { key: 'shopId', label: 'Shop ID' },
        { key: 'invoiceNumber', label: 'Invoice #' }, { key: 'idempotencyKey', label: 'Idempotency Key' }, { key: 'saleDate', label: 'Date' },
        { key: 'status', label: 'Status' }, { key: 'customerId', label: 'Customer ID' },
        { key: 'customerName', label: 'Customer' }, { key: 'customerPhone', label: 'Customer Phone' },
        { key: 'cashierId', label: 'Cashier ID' }, { key: 'cashierName', label: 'Cashier' },
        { key: 'paymentMethod', label: 'Payment Mode' }, { key: 'isKhata', label: 'Is Khata' }, { key: 'paymentBreakdown', label: 'Payment Breakdown', value: (bill) => JSON.stringify(bill.paymentBreakdown || {}) },
        { key: 'items', label: 'Item Lines', value: (bill) => JSON.stringify(bill.items || []) },
        { key: 'returns', label: 'Return Lines', value: (bill) => JSON.stringify(bill.returns || []) },
        { key: 'subtotal', label: 'Subtotal (paise)' }, { key: 'totalDiscount', label: 'Discount (paise)' },
        { key: 'totalTax', label: 'GST (paise)' }, { key: 'roundingAdjustment', label: 'Rounding Adjustment (paise)' }, { key: 'grandTotal', label: 'Grand Total (paise)' },
        { key: 'refundTotal', label: 'Refund Total (paise)' }, { key: 'creditAmount', label: 'Credit (paise)' },
        { key: 'paidAmount', label: 'Paid (paise)' }, { key: 'totalCost', label: 'Cost (paise)' },
        { key: 'paymentDetails', label: 'Payment Details', value: (bill) => JSON.stringify(bill.paymentDetails || {}) },
        { key: 'notes', label: 'Notes' }, { key: 'createdAt', label: 'Created At' }, { key: 'updatedAt', label: 'Updated At' }
      ];
      const csv = toCsv(allBills, columns);
      const filename = `bills-full-export-${archiveDate}-through-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(filename, csv);
      setArchivePreview({ ...summary, ...preview, exported: allBills.length, exportToken, verifiedIds: [...unique] });
      setArchiveFileReady(true);
      setArchiveBackupConfirmed(false);
      setArchiveMessage(`Verified ${allBills.length} unique bill records. The full CSV download has started. Save the file before checking the backup box.`);
    } catch (err) {
      setArchiveError(err.response?.data?.error?.message || err.message || 'Could not prepare and verify the full export.');
      setArchivePreview(null);
    } finally {
      setArchiveLoading(false);
    }
  };

  const clearVerifiedOldBills = async () => {
    if (!archivePreview?.exportToken || !archiveFileReady || !archiveBackupConfirmed) return;
    const confirmed = window.confirm(`Delete ${archivePreview.eligible} eligible bill records dated before ${archiveDate}? ${archivePreview.protected} bills with customer, credit, or return history will be kept. This cannot be undone.`);
    if (!confirmed) return;
    setArchiveLoading(true);
    setArchiveError('');
    setArchiveMessage('');
    try {
      const res = await api.post('/sales/archive/clear', { exportToken: archivePreview.exportToken });
      setArchiveMessage(`Done. Cleared ${res.data.data.deleted} eligible bills. Kept ${res.data.data.protected} protected bills.`);
      setArchivePreview(null);
      setArchiveFileReady(false);
      await loadSales();
    } catch (err) {
      setArchiveError(err.response?.data?.error?.message || 'Bills were not cleared. Refresh the preview and export again.');
    } finally {
      setArchiveLoading(false);
    }
  };

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
          {activeTab === 'invoices' && activeShop?.role === 'owner' && (
            <button
              onClick={() => { setArchiveOpen(true); setArchiveDate(''); setArchivePreview(null); setArchiveError(''); setArchiveMessage(''); setArchiveFileReady(false); setArchiveBackupConfirmed(false); }}
              className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
              title="Export complete bill history and safely clear eligible old bills"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export & Clear Old Bills</span>
            </button>
          )}
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


      {archiveOpen && activeShop?.role === 'owner' && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="archive-title">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="archive-title" className="text-lg font-bold text-slate-900">Export all bills and clear old bills</h3>
                <p className="mt-1 text-xs text-slate-600">Choose a cutoff date. Bills dated before that day are eligible, subject to the protections below. Current-month bills are protected.</p>
              </div>
              <button type="button" onClick={() => setArchiveOpen(false)} className="px-3 py-2 text-sm border rounded-lg">Close</button>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Clear bills dated before
              <input type="date" value={archiveDate} onChange={(event) => { setArchiveDate(event.target.value); setArchivePreview(null); setArchiveFileReady(false); setArchiveMessage(''); setArchiveError(''); }} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-base" />
            </label>
            {archiveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{archiveError}</p>}
            {archiveMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{archiveMessage}</p>}
            {archivePreview && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1 text-sm">
                <p><strong>All bills in this shop:</strong> {archivePreview.totalAll}</p>
                <p><strong>Old bills before cutoff:</strong> {archivePreview.totalOld}</p>
                <p><strong>Eligible to clear:</strong> {archivePreview.eligible}</p>
                <p><strong>Protected and kept:</strong> {archivePreview.protected}</p>
                {archiveFileReady && <p><strong>Export verified:</strong> {archivePreview.exported} unique records</p>}
                <p className="pt-1 text-xs text-slate-600">This full-detail CSV includes all bills in the shop, with each item line and return/refund detail. The cutoff is only for deciding which bills may be cleared. Download it and keep a backup before confirming. Bills with customer/ledger, credit, or return history are protected, and stock-movement history is kept.</p>
              </div>
            )}
            {!archivePreview ? (
              <button type="button" disabled={!archiveDate || archiveLoading} onClick={async () => {
                setArchiveLoading(true); setArchiveError(''); setArchiveMessage(''); setArchiveFileReady(false); setArchiveBackupConfirmed(false);
                try {
                  const response = await api.get('/sales/archive/preview', { params: { beforeDate: archiveDate } });
                  setArchivePreview(response.data.data);
                } catch (err) {
                  setArchiveError(err.response?.data?.error?.message || 'Could not load the preview.');
                } finally { setArchiveLoading(false); }
              }} className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50">
                {archiveLoading ? 'Checking bills...' : 'Preview bill counts'}
              </button>
            ) : !archiveFileReady ? (
              <button type="button" disabled={archiveLoading} onClick={exportAllBillsAndPrepareClear} className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50">
                {archiveLoading ? 'Exporting and verifying all bills...' : 'Download and verify full backup'}
              </button>
            ) : (
              <>
                <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  <input type="checkbox" checked={archiveBackupConfirmed} onChange={(event) => setArchiveBackupConfirmed(event.target.checked)} className="mt-1 h-5 w-5" />
                  <span>I saved the downloaded CSV backup and understand clearing cannot be undone.</span>
                </label>
                <button type="button" disabled={!archiveBackupConfirmed || archiveLoading || archivePreview.eligible === 0} onClick={clearVerifiedOldBills} className="w-full rounded-xl bg-rose-700 px-4 py-3 font-bold text-white disabled:opacity-50">
                  {archiveLoading ? 'Working...' : `Clear ${archivePreview.eligible} eligible old bills`}
                </button>
              </>
            )}
            <p className="text-[11px] text-slate-500">Three safeguards: see the counts first, download and verify the CSV, confirm you saved it, then separately confirm deletion. If records change after export, the clear step stops.</p>
          </div>
        </div>
      )}

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
