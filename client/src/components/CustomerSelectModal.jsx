import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Phone, User, Check, AlertCircle, Wallet } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export function CustomerSelectModal({ isOpen, onClose, onSelectCustomer, selectedCustomer }) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Quick Add Form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCustomers(search);
      setIsAddingNew(false);
      setErrorMsg('');
    }
  }, [isOpen, search]);

  const loadCustomers = async (searchTerm = '') => {
    try {
      setLoading(true);
      const res = await api.get('/customers', {
        params: { search: searchTerm, limit: 20 }
      });
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to search customers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      setErrorMsg('Customer name and phone number are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const res = await api.post('/customers', {
        name: newName.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim(),
        creditLimit: parseFloat(newCreditLimit) || 0
      });

      if (res.data.success) {
        const created = res.data.data;
        onSelectCustomer({
          id: created._id,
          _id: created._id,
          name: created.name,
          phone: created.phone,
          outstandingUdhaar: created.outstandingUdhaar || 0,
          creditLimit: created.creditLimit || 0
        });
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {isAddingNew ? 'Register New Customer' : 'Select Customer'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAddingNew ? 'Add customer profile for billing & Khata credit' : 'Link customer to current bill & Khata ledger'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isAddingNew ? (
          /* QUICK ADD FORM */
          <form onSubmit={handleCreateCustomer} className="p-5 space-y-4 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Ramesh Kumar"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">+91</span>
                <input
                  type="tel"
                  required
                  placeholder="98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 (Unlimited)"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Area / Locality
                </label>
                <input
                  type="text"
                  placeholder="e.g. Market Road"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                Back to Search
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                {isSubmitting ? 'Saving...' : 'Save & Select Customer'}
              </button>
            </div>
          </form>
        ) : (
          /* SEARCH & LIST VIEW */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search Box + Add Button */}
            <div className="p-3 border-b border-slate-200 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by customer name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewName(search);
                  setIsAddingNew(true);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ New</span>
              </button>
            </div>

            {/* Quick Option: Walk-in Anonymous Customer */}
            <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Default:</span>
              <button
                type="button"
                onClick={() => {
                  onSelectCustomer(null);
                  onClose();
                }}
                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${
                  !selectedCustomer
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Walk-in Customer (No Khata)
              </button>
            </div>

            {/* Customers List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Searching customers...</div>
              ) : customers.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs font-medium text-slate-600">No customers found</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName(search);
                      setIsAddingNew(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Register "{search || 'New Customer'}" now
                  </button>
                </div>
              ) : (
                customers.map((c) => {
                  const isSelected = selectedCustomer?.id === c._id || selectedCustomer?._id === c._id;
                  const hasDebt = (c.outstandingUdhaar || 0) > 0;
                  return (
                    <div
                      key={c._id}
                      onClick={() => {
                        onSelectCustomer({
                          id: c._id,
                          _id: c._id,
                          name: c.name,
                          phone: c.phone,
                          outstandingUdhaar: c.outstandingUdhaar || 0,
                          creditLimit: c.creditLimit || 0
                        });
                        onClose();
                      }}
                      className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border border-blue-200 ring-1 ring-blue-500/20'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{c.name}</span>
                            {isSelected && (
                              <span className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                            <Phone className="h-3 w-3" />
                            <span>{c.phone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Balance Badge */}
                      <div className="text-right">
                        {hasDebt ? (
                          <div className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            <span>Udhaar: {formatCurrency(c.outstandingUdhaar)}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Clear
                          </span>
                        )}
                        {c.creditLimit > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Limit: {formatCurrency(c.creditLimit)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
