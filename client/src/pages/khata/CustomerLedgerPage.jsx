import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  Phone,
  User,
  Printer,
  Plus,
  Minus,
  CheckCircle,
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReceivePaymentModal } from '../../components/ReceivePaymentModal';
import { WhatsAppReminderModal } from '../../components/WhatsAppReminderModal';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

export function CustomerLedgerPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);

  // Manual Adjustment Modal
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjType, setAdjType] = useState('debit'); // 'debit' (+ debt) or 'credit' (- debt)
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);
  const [adjError, setAdjError] = useState('');

  useEffect(() => {
    loadLedger();
  }, [customerId]);

  const loadLedger = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/khata/customers/${customerId}/ledger`);
      if (res.data.success) {
        setLedgerData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load customer ledger', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintStatement = () => {
    window.print();
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(adjAmount);
    if (!amountNum || amountNum <= 0) {
      setAdjError('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmittingAdj(true);
      setAdjError('');
      const res = await api.post(`/khata/customers/${customerId}/adjustment`, {
        type: adjType,
        amount: amountNum,
        notes: adjNotes.trim()
      });

      if (res.data.success) {
        setAdjModalOpen(false);
        setAdjAmount('');
        setAdjNotes('');
        loadLedger();
      }
    } catch (err) {
      setAdjError(err.response?.data?.error?.message || 'Failed to record adjustment');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const customer = ledgerData?.customer;
  const entries = ledgerData?.entries || [];
  const summary = ledgerData?.summary;

  const currentUdhaar = customer?.outstandingUdhaar || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 font-sans">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/khata')}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
            title="Back to Khata Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Customer Ledger Statement</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Authoritative
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Audit trail of all credit sales, payments received, and running account balances
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintStatement}
            className="px-3 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print Statement</span>
          </button>
          <button
            onClick={() => setAdjModalOpen(true)}
            className="px-3 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Manual Adjustment</span>
          </button>
          {currentUdhaar > 0 && (
            <button
              onClick={() => setReminderModalOpen(true)}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center shrink-0"
              title="Send WhatsApp payment reminder"
              aria-label="Send WhatsApp payment reminder"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Receive Payment</span>
          </button>
        </div>
      </div>

      {/* Customer Profile & Financial Summary Header */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-700 font-extrabold text-xl flex items-center justify-center shrink-0 border border-blue-100">
            {customer?.name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">{customer?.name || 'Loading...'}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {customer?.phone}
              </span>
              {customer?.address && (
                <span>• {customer.address}</span>
              )}
              <span>• Total Purchases: {formatCurrency(customer?.totalPurchases || 0)}</span>
              {customer?.lastReminderSentAt && (
                <span className="flex items-center gap-1 text-emerald-700 font-sans font-semibold">
                  • <WhatsAppIcon className="h-3 w-3 inline text-emerald-600" /> Last reminder: {formatDate(customer.lastReminderSentAt)}
                  {customer.reminderCount ? ` (${customer.reminderCount} sent)` : ''}
                </span>
              )}
            </div>
            {customer?.creditLimit > 0 && (
              <span className="text-[11px] text-slate-400 block font-sans">
                Credit Limit: {formatCurrency(customer.creditLimit)}
              </span>
            )}
          </div>
        </div>

        {/* Current Outstanding Debt Pill */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-6 shrink-0">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Debited (+)
            </span>
            <span className="text-sm font-bold text-rose-600 font-mono">
              {formatCurrency(summary?.totalDebit || 0)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Credited (-)
            </span>
            <span className="text-sm font-bold text-emerald-600 font-mono">
              {formatCurrency(summary?.totalCredit || 0)}
            </span>
          </div>
          <div className="pl-4 border-l border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Current Outstanding Udhaar
            </span>
            <span className={`text-xl font-extrabold font-mono ${currentUdhaar > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatCurrency(currentUdhaar)}
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Statement Table */}
      <div id="printable-statement" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Chronological Statement of Account</span>
          </span>
          <span className="text-xs text-slate-500">
            Showing {entries.length} recorded transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Reference #</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Details / Notes</th>
                <th className="py-3 px-4 text-right">Debit (+)</th>
                <th className="py-3 px-4 text-right">Credit (-)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    Loading statement records...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center font-sans text-slate-400">
                    No transactions recorded for this customer yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isDebit = entry.debit > 0;
                  return (
                    <tr key={entry._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {entry.referenceId}
                      </td>
                      <td className="py-3 px-4 uppercase text-[11px] font-sans">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          entry.entryType === 'credit_sale'
                            ? 'bg-amber-100 text-amber-800'
                            : entry.entryType === 'payment_received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {entry.entryType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-sans max-w-xs truncate" title={entry.notes}>
                        {entry.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {entry.debit > 0 ? `+${formatCurrency(entry.debit)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {entry.credit > 0 ? `-${formatCurrency(entry.credit)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Payment Modal */}
      <ReceivePaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        customer={customer}
        onPaymentSuccess={() => {
          loadLedger();
        }}
      />

      {/* Manual Adjustment Modal */}
      {adjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Add Balance Adjustment</h3>
            <p className="text-xs text-slate-500">Record an opening balance or manual correction</p>

            {adjError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{adjError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('debit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      adjType === 'debit'
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    + Debit (Increase Debt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('credit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      adjType === 'credit'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    - Credit (Decrease Debt)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="0"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notes / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Previous balance adjustment, error correction"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdjModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  {isSubmittingAdj ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Khata Payment Reminder Modal */}
      <WhatsAppReminderModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        customer={customer}
        onReminderSent={() => {
          loadLedger();
        }}
      />
    </div>
  );
}
