import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export function NotificationToast({ toast, onClose }) {
  if (!toast) return null;

  const { type = 'success', message } = toast;

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />,
    info: <Info className="h-4 w-4 text-blue-600 shrink-0" />
  };

  const borderStyles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div
        className={`px-4 py-3 rounded-2xl border shadow-xl flex items-center gap-3 text-xs font-medium ${
          borderStyles[type] || borderStyles.info
        }`}
      >
        {icons[type]}
        <span className="flex-1">{message}</span>
        {onClose && (
          <button onClick={onClose} className="p-0.5 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
