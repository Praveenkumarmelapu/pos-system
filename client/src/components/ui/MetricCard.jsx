import React from 'react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export function MetricCard({
  title,
  value,
  isCurrency = false,
  comparisonText,
  icon: Icon,
  variant = 'neutral', // neutral, primary, success, warning
  badge
}) {
  const variantStyles = {
    neutral: 'bg-white border-slate-200/80 text-slate-800',
    primary: 'bg-blue-50/40 border-blue-100 text-blue-900',
    success: 'bg-emerald-50/40 border-emerald-100 text-emerald-950',
    warning: 'bg-amber-50/40 border-amber-100 text-amber-950'
  };

  const iconStyles = {
    neutral: 'bg-slate-100 text-slate-700',
    primary: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
    success: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
    warning: 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
  };

  return (
    <div
      className={`p-5 rounded-2xl border shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${
        variantStyles[variant] || variantStyles.neutral
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        {Icon && (
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconStyles[variant]}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {isCurrency ? formatCurrency(value) : formatNumber(value)}
        </div>
        {comparisonText && (
          <p className="mt-1.5 text-xs text-slate-500 font-medium flex items-center gap-1.5">
            {comparisonText}
          </p>
        )}
      </div>
    </div>
  );
}
