import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Store,
  Users,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { MetricCard } from '../../components/ui/MetricCard';
import { formatCurrency, formatDate } from '../../utils/formatters';

export function SuperAdminPage() {
  const [metrics, setMetrics] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metRes, shopsRes] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/admin/shops')
      ]);
      if (metRes.data.success) setMetrics(metRes.data.data);
      if (shopsRes.data.success) setShops(shopsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load platform admin metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (shopId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/admin/shops/${shopId}/status`, { status: nextStatus });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update shop status.');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase tracking-wider">
              SaaS Super Admin
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Platform Multi-Tenant Oversight
          </h2>
          <p className="text-xs text-slate-500">
            Real-time shop health, tenant partitioning status, and platform gross volume
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs flex items-center gap-2 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Platform KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Tenant Shops"
          value={metrics?.shops?.total || 0}
          comparisonText={`${metrics?.shops?.active || 0} active, ${metrics?.shops?.suspended || 0} suspended`}
          icon={Store}
          variant="primary"
        />

        <MetricCard
          title="Total User Accounts"
          value={metrics?.users?.total || 0}
          comparisonText="Store owners, managers & cashiers"
          icon={Users}
          variant="neutral"
        />

        <MetricCard
          title="Platform Gross Volume"
          value={metrics?.sales?.totalVolume || 0}
          isCurrency={true}
          comparisonText="Total billing transactions across all shops"
          icon={DollarSign}
          variant="success"
        />

        <MetricCard
          title="Total Bills Processed"
          value={metrics?.sales?.totalTransactions || 0}
          comparisonText="All-time sales checkout records"
          icon={Building2}
          variant="neutral"
        />
      </div>

      {/* Registered Tenant Shops Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Tenant Shops Directory</h3>
          <span className="text-xs text-slate-400 font-medium">{shops.length} registered stores</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Tenant ID</th>
                <th className="px-5 py-3.5">Shop Name</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Owner Contact</th>
                <th className="px-5 py-3.5">Subscription Plan</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">Loading platform stores...</td>
                </tr>
              ) : (
                shops.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600 text-sm">{s.shopId}</td>

                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <div>{s.name}</div>
                      {s.gstin && <div className="text-[10px] text-slate-400 font-mono">GSTIN: {s.gstin}</div>}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 font-medium">{s.businessCategory}</td>

                    <td className="px-5 py-3.5 text-slate-600">
                      <div className="font-semibold text-slate-800">{s.ownerId?.name || s.contactEmail}</div>
                      <div className="text-[10px] text-slate-400">{s.contactPhone}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold uppercase text-[10px] border border-blue-200">
                        {s.subscription?.planId || 'pro'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {s.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleStatus(s._id, s.status)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          s.status === 'active'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {s.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
