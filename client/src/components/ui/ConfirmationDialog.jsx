import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function ConfirmationDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
            isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{message}</p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
