import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Users,
  TrendingDown,
  ArrowUpRight,
  Search,
  Filter,
  FileText,
  DollarSign,
  ChevronRight,
  AlertCircle,
  Plus,
  RefreshCw,
  Printer,
  MessageCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReceivePaymentModal } from '../../components/ReceivePaymentModal';
import { CustomerSelectModal } from '../../components/CustomerSelectModal';
import { WhatsAppReminderModal } from '../../components/WhatsAppReminderModal';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

export function KhataDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('debtors_only'); // 'debtors_only' | 'all'
  const [page, setPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Modals
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [selectedCustomerForReminder, setSelectedCustomerForReminder] = useState(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);

  useEffect(() => {
    loadKhataData();
  }, [search, filter, page]);

  const loadKhataData = async () => {
    try {
      setLoading(true);
      const [sumRes, custRes] = await Promise.all([
        api.get('/khata/summary'),
        api.get('/khata/customers', {
          params: { search, filter, page, limit: 25 }
        })
      ]);

      if (sumRes.data.success) {
        setSummary(sumRes.data.data);
      }
      if (custRes.data.success) {
        setCustomers(custRes.data.data);
        setTotalCustomers(custRes.data.meta?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load Khata data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (customer) => {
    setSelectedCustomerForPayment(customer);
    setPaymentModalOpen(true);
  };

  const handleOpenReminder = (customer) => {
    setSelectedCustomerForReminder(customer);
    setReminderModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-amber-600" />
            <span>Customer Khata & Credit Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track customer balances (Udhaar), collect payments, and manage store credit statements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadKhataData()}
            className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            onClick={() => setAddCustomerModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Register Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Receivables Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Udhaar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Udhaar Receivables
            </span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {formatCurrency(summary?.totalOutstandingPaise || 0)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Credit owed by {summary?.debtorCount || 0} customers
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        {/* Active Debtors */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Debtors
            </span>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">
              {summary?.debtorCount || 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Customers with outstanding debt
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Collections This Month */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Collected This Month
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {formatCurrency(summary?.monthCollectedPaise || 0)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {summary?.monthPaymentCount || 0} payments recorded
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>

        {/* Quick Khata Collection Rate */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Status
            </span>
            <div className="text-base font-extrabold text-slate-800 mt-1">
              {(summary?.totalOutstandingPaise || 0) > 0 ? 'Receivables Active' : 'All Clear'}
            </div>
            <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">
              Verified append-only ledger
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Customers List Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setFilter('debtors_only')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filter === 'debtors_only'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Outstanding Debtors
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                All Customers
              </button>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4 text-right">Outstanding Udhaar</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading Khata customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-700 text-sm">No customers found</p>
                      <p className="text-xs text-slate-400">
                        {filter === 'debtors_only'
                          ? 'No customers currently owe debt to the shop.'
                          : 'Try adjusting your search criteria.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const hasDebt = (c.outstandingUdhaar || 0) > 0;
                  return (
                    <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block">{c.name}</span>
                            {c.address && (
                              <span className="text-[10px] text-slate-400 font-normal block truncate max-w-xs">
                                {c.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <div>{c.phone}</div>
                        {c.lastReminderSentAt && (
                          <div className="text-[10px] text-emerald-700 font-sans font-medium flex items-center gap-1 mt-0.5">
                            <WhatsAppIcon className="h-3 w-3" />
                            <span>Reminded {formatDate(c.lastReminderSentAt)}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        {hasDebt ? (
                          <span className="font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
                            {formatCurrency(c.outstandingUdhaar)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[11px]">
                            ₹0.00 (Clear)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        {c.creditLimit > 0 ? formatCurrency(c.creditLimit) : 'Unlimited'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-800 font-semibold">
                        {formatCurrency(c.totalPurchases || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasDebt && (
                            <button
                              type="button"
                              onClick={() => handleOpenReminder(c)}
                              className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 rounded-lg transition-colors shadow-xs flex items-center justify-center shrink-0"
                              title="Send WhatsApp payment reminder"
                              aria-label="Send WhatsApp payment reminder"
                            >
                              <WhatsAppIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(c)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                          >
                            <span>Receive Pay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/khata/${c._id}`)}
                            className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span>Statement</span>
                          </button>
                        </div>
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
        customer={selectedCustomerForPayment}
        onPaymentSuccess={() => {
          loadKhataData();
        }}
      />

      {/* WhatsApp Khata Reminder Modal */}
      <WhatsAppReminderModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        customer={selectedCustomerForReminder}
        onReminderSent={() => {
          loadKhataData();
        }}
      />

      {/* Quick Customer Register Modal */}
      <CustomerSelectModal
        isOpen={addCustomerModalOpen}
        onClose={() => setAddCustomerModalOpen(false)}
        onSelectCustomer={() => {
          loadKhataData();
        }}
      />
    </div>
  );
}
