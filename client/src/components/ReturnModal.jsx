import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, RotateCcw, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

/**
 * Return / refund flow for a completed bill.
 * Lets the shop pick returned quantities, a refund method and a reason,
 * posts to /sales/:id/return and shows a printable return receipt.
 */
export function ReturnModal({ isOpen, onClose, sale, shop, onReturned }) {
  const [quantities, setQuantities] = useState({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const lines = useMemo(() => {
    if (!sale) return [];
    const returned = {};
    (sale.returns || []).forEach((entry) => {
      const key = String(entry.productId);
      returned[key] = (returned[key] || 0) + entry.quantity;
    });
    return (sale.items || []).map((item) => {
      const key = String(item.productId);
      const remaining = Math.round((item.quantity - (returned[key] || 0)) * 1000) / 1000;
      return { ...item, remaining };
    });
  }, [sale]);

  const hasCustomer = Boolean(sale?.customerId);

  useEffect(() => {
    if (sale && isOpen) {
      setQuantities({});
      setReason('');
      setRefundMethod(hasCustomer && (sale.creditAmount > 0 || sale.isKhata) ? 'khata_adjust' : 'cash');
      setSubmitting(false);
      setError('');
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale, isOpen]);

  if (!isOpen || !sale) return null;

  const setQty = (productId, value) => {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
  };

  const selectedLines = lines
    .map((line) => {
      const raw = quantities[String(line.productId)];
      const qty = Number(raw);
      return { line, qty: Number.isFinite(qty) ? qty : 0 };
    })
    .filter(({ qty }) => qty > 0);

  const estimate = selectedLines.reduce(
    (acc, { line, qty }) => {
      const capped = Math.min(qty, line.remaining);
      if (capped <= 0) return acc;
      acc.total += Math.round((line.lineTotal * capped) / line.quantity);
      acc.tax += Math.round(((line.taxAmount || 0) * capped) / line.quantity);
      return acc;
    },
    { total: 0, tax: 0 }
  );

  const invalidLine = selectedLines.find(({ line, qty }) => qty > line.remaining + 1e-9);

  const handleSubmit = async () => {
    setError('');
    if (selectedLines.length === 0) {
      setError('Enter a return quantity for at least one item.');
      return;
    }
    if (invalidLine) {
      setError(`Only ${invalidLine.line.remaining} qty of '${invalidLine.line.name}' can still be returned.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/sales/${sale._id}/return`, {
        items: selectedLines.map(({ line, qty }) => ({ productId: String(line.productId), quantity: Math.min(qty, line.remaining) })),
        refundMethod,
        reason: reason.trim()
      });
      setResult(res.data.data);
      onReturned?.(res.data.data.sale);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not process the return. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const refund = result?.refund;
  const returnedItems = result?.returnedItems || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
            <RotateCcw className="h-5 w-5" />
            <span>{result ? 'Return processed' : `Return items - ${sale.invoiceNumber}`}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {!result ? (
            <>
              {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}

              <div className="space-y-2">
                {lines.map((line) => {
                  const key = String(line.productId);
                  const soldOut = line.remaining <= 0;
                  return (
                    <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${soldOut ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{line.name}</p>
                        <p className="text-[10px] text-slate-500">
                          Sold {line.quantity} x {formatCurrency(line.unitPrice)}
                          {line.remaining < line.quantity && ` | Already returned ${line.quantity - line.remaining}`}
                        </p>
                      </div>
                      {soldOut ? (
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Returned</span>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max={line.remaining}
                            step="any"
                            value={quantities[key] ?? ''}
                            onChange={(e) => setQty(key, e.target.value)}
                            placeholder="0"
                            className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-right focus:outline-none focus:ring-1 focus:ring-rose-400"
                          />
                          <button
                            type="button"
                            onClick={() => setQty(key, String(line.remaining))}
                            className="text-[10px] font-bold text-rose-600 hover:underline"
                          >
                            All
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Refund method</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="cash">Cash refund</option>
                  <option value="upi">UPI refund</option>
                  <option value="card">Card refund</option>
                  {hasCustomer && <option value="khata_adjust">Adjust in Khata (reduce udhaar)</option>}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                  placeholder="Damaged, wrong item, expired..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                />
              </div>

              {estimate.total > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                  {estimate.tax > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>GST reversed</span>
                      <span className="font-mono">{formatCurrency(estimate.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-rose-700">
                    <span>Refund total</span>
                    <span className="font-mono">{formatCurrency(estimate.total)}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>
                  Refund of {formatCurrency(refund?.total || 0)} recorded
                  {refund?.method === 'khata_adjust'
                    ? ` - Khata reduced by ${formatCurrency(refund.khataAdjusted || 0)}`
                    : ` via ${String(refund?.method || 'cash').toUpperCase()}`}
                  . Stock restored.
                </span>
              </div>

              {/* Printable Return Receipt */}
              <div id="printable-receipt" className="w-full mx-auto p-4 border border-dashed border-slate-300 rounded-xl bg-white text-slate-800 font-mono text-xs">
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <h2 className="text-sm font-bold uppercase tracking-wider">{shop?.name || 'Retail Store'}</h2>
                  {shop?.address?.city && (
                    <p className="text-[11px] text-slate-600">{shop.address.city}, {shop.address.state}</p>
                  )}
                  {shop?.gstin && <p className="text-[11px] font-bold text-slate-700 mt-1">GSTIN: {shop.gstin}</p>}
                  <p className="text-[12px] font-extrabold text-rose-700 mt-1 tracking-widest">RETURN RECEIPT</p>
                </div>

                <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
                  <div className="flex justify-between"><span>Against Bill: {sale.invoiceNumber}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Return Date: {formatDate(new Date().toISOString())}</span></div>
                  {sale.customerName && <div className="flex justify-between text-slate-600"><span>Customer: {sale.customerName}</span></div>}
                </div>

                <div className="py-2.5 border-b border-dashed border-slate-300">
                  <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-200">
                    <span className="w-1/2">Item</span>
                    <span className="w-1/6 text-center">Qty</span>
                    <span className="w-1/3 text-right">Refund</span>
                  </div>
                  <div className="divide-y divide-slate-100 py-1 space-y-1">
                    {returnedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] pt-1">
                        <span className="w-1/2 truncate font-sans">{item.name}</span>
                        <span className="w-1/6 text-center">{item.quantity}</span>
                        <span className="w-1/3 text-right font-semibold font-sans">{formatCurrency(item.refundAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                  {refund?.tax > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>GST Reversed:</span>
                      <span className="font-sans">{formatCurrency(refund.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-300">
                    <span>TOTAL REFUND:</span>
                    <span className="font-sans text-rose-700">{formatCurrency(refund?.total || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Refund Mode:</span>
                    <span className="font-sans font-semibold">
                      {refund?.method === 'khata_adjust' ? 'KHATA ADJUSTED' : String(refund?.method || 'cash').toUpperCase()}
                    </span>
                  </div>
                  {refund?.method === 'khata_adjust' && (
                    <div className="flex justify-between text-slate-600">
                      <span>Khata Reduced:</span>
                      <span className="font-sans">{formatCurrency(refund.khataAdjusted || 0)}</span>
                    </div>
                  )}
                  {reason.trim() && (
                    <div className="flex justify-between text-slate-600">
                      <span>Reason:</span>
                      <span className="font-sans">{reason.trim()}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 text-center text-[10px] text-slate-500">
                  <p className="font-semibold text-slate-700">{shop?.settings?.receiptFooter ?? 'Thank you! Visit again.'}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 font-sans print:hidden">
          {!result ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedLines.length === 0}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{submitting ? 'Processing...' : 'Process Return'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                <Printer className="h-4 w-4" />
                <span>Print Return Receipt</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
