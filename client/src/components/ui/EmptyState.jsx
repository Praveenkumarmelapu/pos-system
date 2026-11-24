import React from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'Try adjusting your search query, filter criteria, or scan a new barcode.',
  actionLabel,
  onAction
}) {
  return (
    <div className="p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 flex flex-col items-center justify-center max-w-md mx-auto my-6">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
        <Icon className="h-7 w-7 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
