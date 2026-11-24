import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Banknote, QrCode, CreditCard, Building, FileText, Printer } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export function ReceivePaymentModal({ isOpen, onClose, customer, onPaymentSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNote, setReferenceNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (isOpen && customer) {
      const outstandingRupees = (customer.outstandingUdhaar || 0) / 100;
      setAmount(outstandingRupees > 0 ? outstandingRupees.toString() : '');
      setPaymentMethod('cash');
      setReferenceNote('');
      setErrorMsg('');
      setPaymentReceipt(null);
      setIdempotencyKey(`rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const currentOutstandingRupees = (customer.outstandingUdhaar || 0) / 100;
  const paymentAmountNum = parseFloat(amount) || 0;
  const newBalanceRupees = Math.max(0, currentOutstandingRupees - paymentAmountNum);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmountNum || paymentAmountNum <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const res = await api.post('/khata/payments', {
        customerId: customer._id || customer.id,
        amount: paymentAmountNum,
        paymentMethod,
        referenceNote: referenceNote.trim(),
        idempotencyKey
      });

      if (res.data.success) {
        setPaymentReceipt(res.data.data.payment);
        if (onPaymentSuccess) {
          onPaymentSuccess(res.data.data);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              {paymentReceipt ? 'Payment Receipt' : 'Receive Khata Payment'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {paymentReceipt ? `Receipt #${paymentReceipt.receiptNumber}` : `Record debt clearance for ${customer.name}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {paymentReceipt ? (
          /* SUCCESSFUL RECEIPT VIEW */
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
              <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-800 text-sm">Payment Recorded Successfully</h4>
              <p className="text-xs text-emerald-600">Customer account balance has been updated</p>
            </div>

            {/* Printable Slip */}
            <div id="payment-receipt-slip" className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <span className="font-bold uppercase tracking-wider text-slate-800 text-xs">UDHAAR PAYMENT RECEIPT</span>
                <p className="text-[11px] text-slate-500">{paymentReceipt.receiptNumber}</p>
                <p className="text-[10px] text-slate-400">{formatDate(paymentReceipt.paymentDate)}</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-800">{customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-slate-700">{customer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-bold uppercase text-slate-800">{paymentReceipt.paymentMethod}</span>
                </div>
                {paymentReceipt.referenceNote && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ref / Note:</span>
                    <span className="text-slate-700">{paymentReceipt.referenceNote}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Previous Balance:</span>
                  <span>{formatCurrency(paymentReceipt.previousBalance)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Amount Paid:</span>
                  <span>-{formatCurrency(paymentReceipt.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-slate-900 pt-1 border-t border-slate-200 text-xs">
                  <span>Remaining Balance:</span>
                  <span className={paymentReceipt.newBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    {formatCurrency(paymentReceipt.newBalance)}
                  </span>
                </div>
              </div>

              <div className="pt-3 text-center text-[10px] text-slate-400">
                Received by: {paymentReceipt.receivedByName || 'Cashier'}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        ) : (
          /* PAYMENT ENTRY FORM */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Customer Summary Banner */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">{customer.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">Ph: {customer.phone}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Debt</span>
                <span className="text-sm font-extrabold text-rose-600">
                  {formatCurrency(customer.outstandingUdhaar || 0)}
                </span>
              </div>
            </div>

            {/* Payment Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Amount to Receive (₹) <span className="text-rose-500">*</span>
                </label>
                {currentOutstandingRupees > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(currentOutstandingRupees.toString())}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Full Clearance (₹{currentOutstandingRupees.toFixed(2)})
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Received Via
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'bank_transfer', label: 'Bank', icon: Building }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 text-blue-700 ring-2 ring-blue-600/20 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference Note */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reference / Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. UPI Ref #, Cheque #, GPay"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Balance Calculation Preview */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Previous Balance:</span>
                <span className="font-semibold text-slate-800">₹{currentOutstandingRupees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>- Receiving Now:</span>
                <span>-₹{paymentAmountNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                <span>New Remaining Balance:</span>
                <span className={newBalanceRupees > 0 ? 'text-rose-600' : 'text-emerald-600 font-black'}>
                  ₹{newBalanceRupees.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || paymentAmountNum <= 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{isSubmitting ? 'Recording...' : `Receive ₹${paymentAmountNum.toFixed(2)}`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
