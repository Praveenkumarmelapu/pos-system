import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, Mail, DollarSign, RefreshCw, CreditCard, ShoppingBag, AlertCircle, MessageCircle } from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { WhatsAppReminderModal } from '../../components/WhatsAppReminderModal';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Customer Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedCustForSettle, setSelectedCustForSettle] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleAction, setSettleAction] = useState('payment'); // 'payment' or 'credit'

  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedCustForReminder, setSelectedCustForReminder] = useState(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers?limit=100');
      if (res.data.success && res.data.data.length > 0) {
        setCustomers(res.data.data);
      } else {
        // Fallback demo seed if empty
        const sample = [
          {
            _id: 'c1',
            name: 'Anand Varma',
            phone: '+91 98490 98765',
            email: 'anand@example.com',
            totalPurchases: 450000, // paise
            totalBills: 12,
            outstandingUdhaar: 0,
            notes: 'Regular kirana customer'
          },
          {
            _id: 'c2',
            name: 'Sunita Rao',
            phone: '+91 98490 12345',
            email: 'sunita@example.com',
            totalPurchases: 182000,
            totalBills: 6,
            outstandingUdhaar: 45000, // ₹450 credit
            notes: 'Monthly settlement on 1st'
          }
        ];
        setCustomers(sample);
      }
    } catch (err) {
      console.warn('Failed to fetch customers, using sample:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Name and mobile number are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/customers', {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim()
      });

      if (res.data.success) {
        setCustomers(prev => [res.data.data, ...prev]);
        setModalOpen(false);
        setName('');
        setPhone('');
        setEmail('');
        setNotes('');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettleUdhaar = async (e) => {
    e.preventDefault();
    if (!selectedCustForSettle || !settleAmount) return;

    try {
      await api.post(`/customers/${selectedCustForSettle._id}/udhaar`, {
        amount: parseFloat(settleAmount),
        action: settleAction
      });
      setSettleModalOpen(false);
      setSettleAmount('');
      setSelectedCustForSettle(null);
      await loadCustomers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to record udhaar payment');
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Management & Khata</h2>
          <p className="text-xs text-slate-500">
            Customer directories, purchase history, and Udhaar / credit ledger tracking
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name or phone number..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Customer Details</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5 text-center">Total Bills</th>
                <th className="px-5 py-3.5 text-right">Lifetime Purchases</th>
                <th className="px-5 py-3.5 text-right">Udhaar / Credit Balance</th>
                <th className="px-5 py-3.5">Notes</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                    </div>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-slate-700 font-medium">{c.phone}</td>

                  <td className="px-5 py-3.5 text-center font-semibold text-slate-800">
                    {c.totalBills} orders
                  </td>

                  <td className="px-5 py-3.5 text-right font-extrabold text-slate-900">
                    {formatCurrency(c.totalPurchases)}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    {c.outstandingUdhaar > 0 ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                        {formatCurrency(c.outstandingUdhaar)} due
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold text-xs">Clear (₹0.00)</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate font-medium">
                    {c.notes || '-'}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(c.outstandingUdhaar || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustForReminder(c);
                            setReminderModalOpen(true);
                          }}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 rounded-lg transition-colors shadow-xs flex items-center justify-center shrink-0"
                          title="Send WhatsApp payment reminder"
                          aria-label="Send WhatsApp payment reminder"
                        >
                          <WhatsAppIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustForSettle(c);
                          setSettleAmount('');
                          setSettleAction('payment');
                          setSettleModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                      >
                        Khata Settle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Customer Account</h3>
            <p className="text-xs text-slate-500">
              Customer details remain strictly private to your shop.
            </p>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98490 00000"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks / Apartment #</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Flat 104, weekly billing"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Udhaar Modal */}
      {settleModalOpen && selectedCustForSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Khata / Udhaar Settlement
            </h3>
            <p className="text-xs text-slate-500">
              Customer: <strong className="text-slate-800">{selectedCustForSettle.name}</strong> ({selectedCustForSettle.phone})
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <span className="text-slate-600 font-medium">Current Balance Due:</span>
              <span className="text-sm font-black text-rose-700">
                {formatCurrency(selectedCustForSettle.outstandingUdhaar)}
              </span>
            </div>

            <form onSubmit={handleSettleUdhaar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Transaction Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettleAction('payment')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      settleAction === 'payment'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Receive Payment (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleAction('credit')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      settleAction === 'credit'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Add Credit / Udhaar (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSettleModalOpen(false);
                    setSelectedCustForSettle(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Record Settlement
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
        customer={selectedCustForReminder}
        onReminderSent={() => loadCustomers()}
      />
    </div>
  );
}
