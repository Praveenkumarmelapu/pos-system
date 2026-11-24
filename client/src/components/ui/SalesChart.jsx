import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';

export function SalesChart({ data = [] }) {
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'combo' | 'area'

  // Transform data for Recharts: amount in Rupees
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(item => {
      const rawDate = item._id || '';
      let displayDate = rawDate;
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        }
      } catch {}

      const revenue = (item.totalSales || 0) / 100;
      const bills = item.billsCount || 0;
      const avgBill = bills > 0 ? Math.round(revenue / bills) : 0;

      return {
        date: displayDate,
        fullDate: rawDate,
        revenue,
        bills,
        avgBill
      };
    });
  }, [data]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return { totalRevenue: 0, totalBills: 0, peakRevenue: 0, peakDate: '-', avgDaily: 0 };
    let totalRevenue = 0;
    let totalBills = 0;
    let peakRevenue = 0;
    let peakDate = '-';

    chartData.forEach(d => {
      totalRevenue += d.revenue;
      totalBills += d.bills;
      if (d.revenue > peakRevenue) {
        peakRevenue = d.revenue;
        peakDate = d.date;
      }
    });

    const avgDaily = Math.round(totalRevenue / chartData.length);
    return { totalRevenue, totalBills, peakRevenue, peakDate, avgDaily };
  }, [chartData]);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-txt-muted text-xs border border-dashed border-border rounded-lg bg-surface-muted">
        <BarChart3 className="h-8 w-8 text-txt-muted/60 mb-2 stroke-[1.2]" />
        <span>No sales transaction trends available yet.</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-nav text-white px-3.5 py-3 rounded-lg shadow-xl text-xs border border-slate-700 space-y-2 min-w-[170px] select-none">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-semibold text-slate-300 text-[11px]">{item.date}</span>
            <span className="text-[10px] text-slate-400 font-mono">{item.fullDate}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Daily Sales:</span>
              <span className="font-bold text-white font-mono text-sm">
                ₹{item.revenue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Total Bills:</span>
              <span className="font-semibold text-blue-300 font-mono">
                {item.bills} {item.bills === 1 ? 'sale' : 'sales'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Avg Ticket:</span>
              <span className="text-slate-300 font-mono text-[11px]">
                ₹{item.avgBill.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3 select-none">
      {/* Top Controls & Mini KPI Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border">
        {/* Quick Highlights */}
        <div className="flex items-center gap-3 text-[11px] text-txt-secondary">
          <div className="flex items-center gap-1.5 bg-blue-50 text-action-hover px-2.5 py-1 rounded-md border border-blue-200/60 font-medium">
            <span className="text-action font-semibold">Total:</span>
            <span className="font-bold font-mono">₹{stats.totalRevenue.toLocaleString('en-IN')}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-surface-muted text-txt px-2.5 py-1 rounded-md border border-border font-medium">
            <span className="text-txt-secondary">Daily Avg:</span>
            <span className="font-semibold font-mono">₹{stats.avgDaily.toLocaleString('en-IN')}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 bg-surface-muted text-txt px-2.5 py-1 rounded-md border border-border font-medium">
            <span className="text-txt-secondary">Peak:</span>
            <span className="font-semibold font-mono">{stats.peakDate} (₹{stats.peakRevenue.toLocaleString('en-IN')})</span>
          </div>
        </div>

        {/* Graph Style Selector Tabs */}
        <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg border border-border shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              chartType === 'bar'
                ? 'bg-action text-white shadow-xs font-semibold'
                : 'text-txt-secondary hover:text-txt'
            }`}
            title="Bar Chart Representation"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Bar View</span>
          </button>

          <button
            type="button"
            onClick={() => setChartType('combo')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              chartType === 'combo'
                ? 'bg-action text-white shadow-xs font-semibold'
                : 'text-txt-secondary hover:text-txt'
            }`}
            title="Combo Dual View: Revenue Bars + Bills Trend"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Dual Combo</span>
          </button>

          <button
            type="button"
            onClick={() => setChartType('area')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              chartType === 'area'
                ? 'bg-action text-white shadow-xs font-semibold'
                : 'text-txt-secondary hover:text-txt'
            }`}
            title="Smooth Curve Area View"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Wave Area</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.65} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="revenue"
                fill="url(#barGradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          ) : chartType === 'combo' ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="comboBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#2563EB' }}
                tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#D97706' }}
                tickFormatter={(val) => `${val} bills`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                name="Sales (₹)"
                fill="url(#comboBarGradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </ComposedChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563EB"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#areaGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
