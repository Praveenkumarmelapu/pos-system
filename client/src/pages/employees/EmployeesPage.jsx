import React, { useState, useEffect, useCallback } from 'react';
import { Plus, KeyRound, Copy, Check, BellRing } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function EmployeesPage() {
  const { activeShop, user } = useAuth();
  const isOwner = activeShop?.role === 'owner';
  const [employees, setEmployees] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState(null);
  const [tempPasswordInfo, setTempPasswordInfo] = useState(null);
  const [copiedTemp, setCopiedTemp] = useState(false);

  const loadResetRequests = useCallback((signal) => {
    return api.get('/shop/password-reset-requests', { signal })
      .then(res => setResetRequests(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    const controller = new AbortController();
    api.get('/shop/staff', { signal: controller.signal })
      .then(res => setEmployees(res.data.data))
      .catch(() => { if (!controller.signal.aborted) setError('Could not load staff. Refresh to retry.'); });
    loadResetRequests(controller.signal);
    return () => controller.abort();
  }, [isOwner, activeShop?.shopId, loadResetRequests]);

  const handleResetPassword = async (emp) => {
    if (!window.confirm(`Issue a new temporary password for ${emp.name}? Their old password stops working immediately.`)) return;
    setResettingId(emp.id);
    setError('');
    try {
      const res = await api.post(`/shop/staff/${emp.id}/reset-password`);
      setTempPasswordInfo(res.data.data);
      setCopiedTemp(false);
      loadResetRequests();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not reset the password.');
    } finally {
      setResettingId(null);
    }
  };

  const copyTempPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPasswordInfo?.temporaryPassword || '');
      setCopiedTemp(true);
      setTimeout(() => setCopiedTemp(false), 2500);
    } catch {}
  };

  const handleAddEmployee = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/shop/staff', { name, email, password, role });
      setEmployees(previous => [...previous, res.data.data]);
      setModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Unable to create the staff account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff & Cashier Permissions</h2>
          <p className="text-xs text-slate-500">
            Manage cashier accounts, role-based access, and authorized store operations
          </p>
        </div>

        <button
          disabled={!isOwner}
          onClick={() => { setError(''); setModalOpen(true); }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {!isOwner && <p className="text-sm text-slate-600">Only a store owner can manage staff.</p>}
      {error && !modalOpen && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {isOwner && resetRequests.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
            <BellRing className="h-4 w-4" />
            <span>Password reset requests ({resetRequests.length})</span>
          </div>
          {resetRequests.map((req) => {
            const emp = employees.find(e => e.email === req.email);
            return (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 bg-white/60 rounded-xl px-3 py-2 border border-amber-100">
                <span><span className="font-bold">{req.name}</span> ({req.email}) forgot their password.</span>
                {emp && (
                  <button
                    onClick={() => handleResetPassword(emp)}
                    disabled={resettingId === emp.id}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-lg text-[11px] font-bold shrink-0"
                  >
                    {resettingId === emp.id ? 'Issuing...' : 'Issue Temporary Password'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map(emp => (
          <div key={emp.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {emp.name[0]}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{emp.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{emp.email}</span>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                emp.role === 'owner'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {emp.role}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Granted Permissions
              </span>
              <div className="flex flex-wrap gap-1">
                {emp.permissions.map((p, idx) => (
                  <span key={idx} className="text-[10px] font-semibold bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {isOwner && emp.email !== user?.email && emp.role !== 'owner' && (
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleResetPassword(emp)}
                  disabled={resettingId === emp.id}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{resettingId === emp.id ? 'Issuing...' : 'Reset Password'}</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {tempPasswordInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Temporary Password Issued</h3>
            <p className="text-xs text-slate-500">
              Share this with <span className="font-bold text-slate-800">{tempPasswordInfo.staffName}</span> in person or on WhatsApp. It is shown only once - their old password no longer works, and they can set a new one from the key icon after signing in.
            </p>
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <code className="flex-1 text-sm font-bold text-slate-900 tracking-wider">{tempPasswordInfo.temporaryPassword}</code>
              <button
                onClick={copyTempPassword}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
              >
                {copiedTemp ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedTemp ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setTempPasswordInfo(null)}
                className="px-5 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Staff Member</h3>
            <p className="text-xs text-slate-500">Cashiers can scan products and complete sales transactions.</p>

            <form onSubmit={handleAddEmployee} className="space-y-3.5">
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Staff member name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@kirana.local"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Store Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="cashier">Cashier (Billing & Printing)</option>
                  <option value="manager">Store Manager (Billing & Inventory)</option>
                </select>
              </div>

              <label className="block text-sm">Staff password
                <input type="password" required minLength={8} maxLength={72} autoComplete="new-password"
                  value={password} onChange={event => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  {saving ? 'Creating…' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
