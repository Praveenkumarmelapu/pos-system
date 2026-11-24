import React from 'react';

export function LoadingSkeleton({ count = 8, type = 'card' }) {
  if (type === 'table') {
    return (
      <div className="divide-y divide-slate-100">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
              <div className="space-y-1.5">
                <div className="h-3 bg-slate-100 rounded w-40"></div>
                <div className="h-2.5 bg-slate-100 rounded w-24"></div>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded w-16"></div>
            <div className="h-3 bg-slate-100 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3 animate-pulse">
          <div className="aspect-square bg-slate-100 rounded-xl"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded w-3/4"></div>
            <div className="h-2.5 bg-slate-100 rounded w-1/2"></div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
            <div className="h-4 bg-slate-100 rounded w-16"></div>
            <div className="h-7 w-12 bg-slate-100 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
