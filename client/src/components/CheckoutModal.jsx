import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  CheckCircle2,
  PieChart,
  User,
  AlertCircle,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';
import { CustomerSelectModal } from './CustomerSelectModal';

export function CheckoutModal({ isOpen, onClose, onCompleteSale, isSubmitting }) {
  const { totals, billDiscount, setBillDiscount, selectedCustomer, setSelectedCustomer } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'upi' | 'card' | 'credit' | 'split'
  const [cashTendered, setCashTendered] = useState('');
  const [referenceNote, setReferenceNote] = useState('');

  // Split payment state
  const [splitPaidAmount, setSplitPaidAmount] = useState('');
  const [splitPaidMethod, setSplitPaidMethod] = useState('cash'); // 'cash' | 'upi' | 'card'

  // Customer selector modal trigger
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  if (!isOpen) return null;

  const grandTotalRupees = totals.grandTotalPaise / 100;
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeReturned = Math.max(0, tenderedNum - grandTotalRupees);

  // Split calculation
  const splitPaidNum = parseFloat(splitPaidAmount) || 0;
  const splitKhataAmount = Math.max(0, grandTotalRupees - splitPaidNum);

  // Khata requirements
  const isKhataTransaction = paymentMethod === 'credit' || (paymentMethod === 'split' && splitKhataAmount > 0);
  const hasRegisteredCustomer = Boolean(selectedCustomer?.id || selectedCustomer?._id);

  // Projected customer balances
  const currentUdhaarRupees = (selectedCustomer?.outstandingUdhaar || 0) / 100;
  const additionToKhataRupees = paymentMethod === 'credit' ? grandTotalRupees : (paymentMethod === 'split' ? splitKhataAmount : 0);
  const projectedBalanceRupees = currentUdhaarRupees + additionToKhataRupees;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isKhataTransaction && !hasRegisteredCustomer) {
      setCustomerModalOpen(true);
      return;
    }

    let paidAmount = grandTotalRupees;
    let creditAmount = 0;
    let breakdown = { cash: 0, upi: 0, card: 0, credit: 0 };

    if (paymentMethod === 'credit') {
      paidAmount = 0;
      creditAmount = grandTotalRupees;
      breakdown.credit = creditAmount;
    } else if (paymentMethod === 'split') {
      paidAmount = Math.min(grandTotalRupees, splitPaidNum);
      creditAmount = splitKhataAmount;
      breakdown[splitPaidMethod] = paidAmount;
      breakdown.credit = creditAmount;
    } else {
      paidAmount = grandTotalRupees;
      creditAmount = 0;
      breakdown[paymentMethod] = paidAmount;
    }

    onCompleteSale({
      paymentMethod,
      paidAmount,
      creditAmount,
      paymentBreakdown: breakdown,
      receivedAmount: paymentMethod === 'cash' ? (tenderedNum || grandTotalRupees) : paidAmount,
      referenceNote: referenceNote.trim(),
      customerId: selectedCustomer?.id || selectedCustomer?._id || null,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      customerPhone: selectedCustomer?.phone || null
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 font-sans">
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Complete Checkout</h3>
              <p className="text-xs text-slate-500">Choose payment method & finalize customer sale</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Amount Due Banner */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                  Total Payable
                </span>
                <span className="text-xs text-blue-600 font-medium">Includes taxes & applied discounts</span>
              </div>
              <span className="text-2xl font-extrabold text-blue-700">
                {formatCurrency(totals.grandTotalPaise)}
              </span>
            </div>

            {/* Linked Customer Card / Selector */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {selectedCustomer?.name || 'Walk-in Customer'}
                    </span>
                    {hasRegisteredCustomer && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        Registered
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {hasRegisteredCustomer ? (
                      <span>
                        Ph: {selectedCustomer.phone} | Outstanding: ₹{currentUdhaarRupees.toFixed(2)}
                      </span>
                    ) : (
                      <span>Anonymous billing (No Khata credit permitted)</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shrink-0"
              >
                {hasRegisteredCustomer ? 'Change' : '+ Select'}
              </button>
            </div>

            {/* Payment Method Selector Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'split', label: 'Partial / Split', icon: PieChart },
                  { id: 'credit', label: 'Full Udhaar', icon: FileText }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 text-blue-700 ring-2 ring-blue-600/20 font-bold shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      <span className="text-[11px] leading-tight">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CASH SPECIFIC INPUT */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cash Tendered by Customer (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder={`e.g. ${Math.ceil(grandTotalRupees)}`}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {tenderedNum > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    <span className="font-semibold text-slate-600">Change to Return:</span>
                    <span className="text-base font-bold text-emerald-600">
                      ₹{changeReturned.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* UPI HELPER */}
            {paymentMethod === 'upi' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div className="text-xs text-slate-600">
                    <p className="font-bold text-slate-800">Scan Shop UPI QR</p>
                    <p>Customer pays via Google Pay, PhonePe, Paytm, or BHIM</p>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="UPI Reference No. or Txn ID (Optional)"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* CARD HELPER */}
            {paymentMethod === 'card' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span>Swipe/Tap card on POS EDC machine</span>
                </div>
                <input
                  type="text"
                  placeholder="Card Last 4 digits or Auth Code (Optional)"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* SPLIT / PARTIAL PAYMENT PANEL */}
            {paymentMethod === 'split' && (
              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span>Partial Payment + Khata Udhaar</span>
                  <span>Total: ₹{grandTotalRupees.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Amount Paid Now (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={grandTotalRupees}
                      autoFocus
                      placeholder="0"
                      value={splitPaidAmount}
                      onChange={(e) => setSplitPaidAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Paid Via
                    </label>
                    <select
                      value={splitPaidMethod}
                      onChange={(e) => setSplitPaidMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / QR</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>

                {/* Remaining to Khata */}
                <div className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                    <Wallet className="h-4 w-4" />
                    <span>Remaining to Khata:</span>
                  </div>
                  <span className="text-base font-extrabold text-rose-700">
                    ₹{splitKhataAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* FULL UDHAAR PANEL */}
            {paymentMethod === 'credit' && (
              <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-purple-900">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span>100% Khata (Pay Later)</span>
                  </span>
                  <span className="text-sm font-extrabold text-purple-700">
                    ₹{grandTotalRupees.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  The entire bill will be added to the customer's credit ledger. No payment is collected today.
                </p>
              </div>
            )}

            {/* KHATA CUSTOMER PROJECTION & WARNING */}
            {isKhataTransaction && (
              <div className="space-y-2">
                {!hasRegisteredCustomer ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Registered customer required for Khata transactions.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomerModalOpen(true)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-bold shrink-0"
                    >
                      Select Now
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Customer's Current Udhaar:</span>
                      <span className="font-semibold text-slate-800">₹{currentUdhaarRupees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 font-medium">
                      <span>+ This Bill Credit:</span>
                      <span className="font-semibold">+₹{additionToKhataRupees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                      <span>New Projected Balance:</span>
                      <span className="text-rose-600">₹{projectedBalanceRupees.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bill-level discount control */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600 font-medium">Extra Bill Discount (₹):</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={billDiscount || ''}
                onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 px-2.5 py-1 text-right font-bold border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Back to Cart
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (isKhataTransaction && !hasRegisteredCustomer) ||
                  (paymentMethod === 'cash' && tenderedNum > 0 && tenderedNum < grandTotalRupees)
                }
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {isSubmitting
                    ? 'Processing Sale...'
                    : paymentMethod === 'credit'
                    ? `Confirm Khata Bill (₹${grandTotalRupees.toFixed(2)})`
                    : `Confirm & Print Receipt`}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Customer Selector Modal */}
      <CustomerSelectModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={(cust) => setSelectedCustomer(cust)}
      />
    </>
  );
}
