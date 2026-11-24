import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
  AlertCircle,
  Clock,
  User,
  Phone,
  Wallet,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  formatKhataReminderWhatsAppMessage,
  openWhatsAppShare,
  copyToClipboard,
  cleanPhoneNumber
} from '../utils/whatsapp';
import { WhatsAppIcon } from './ui/WhatsAppIcon';

export function WhatsAppReminderModal({ isOpen, onClose, customer, onReminderSent }) {
  const { activeShop } = useAuth();
  const [phone, setPhone] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [upiId, setUpiId] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer && isOpen) {
      setPhone(customer.phone || '');
      setCustomNote('');
      setCopied(false);
      setSentSuccess(false);
      setError('');
    }
  }, [customer, isOpen]);

  const previewMessage = useMemo(() => {
    if (!customer) return '';
    return formatKhataReminderWhatsAppMessage({
      customer,
      shop: activeShop,
      customNote,
      upiId
    });
  }, [customer, activeShop, customNote, upiId]);

  if (!isOpen || !customer) return null;

  const outstandingRupees = (customer.outstandingUdhaar || 0) / 100;
  const isEligibleForReminder = (customer.outstandingUdhaar || 0) > 0;
  const cleanedRecipient = cleanPhoneNumber(phone);

  const handleCopy = async () => {
    const success = await copyToClipboard(previewMessage);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!phone.trim()) {
      setError('Please provide a valid mobile number for the customer.');
      return;
    }

    try {
      setSending(true);
      setError('');

      // Open WhatsApp Click-to-chat
      openWhatsAppShare(phone, previewMessage);

      // Record reminder in backend audit log & customer stats
      if (customer._id || customer.id) {
        const custId = customer._id || customer.id;
        await api.post(`/khata/customers/${custId}/reminder`, {
          channel: 'whatsapp',
          customNote: customNote.trim(),
          phone: phone.trim()
        }).catch((err) => {
          console.warn('Could not record reminder audit log:', err);
        });
      }

      setSentSuccess(true);
      if (onReminderSent) {
        onReminderSent();
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to launch WhatsApp. You can still copy the message text.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Topbar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-emerald-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <WhatsAppIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>WhatsApp Khata Payment Reminder</span>
              </h3>
              <p className="text-[11px] text-emerald-800">
                Send professional digital Udhaar reminder directly to customer's WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sentSuccess && (
            <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs flex items-center gap-2 border border-emerald-300 font-semibold">
              <Check className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>WhatsApp chat opened! Reminder logged in customer history.</span>
            </div>
          )}

          {/* Customer & Udhaar Snapshot Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                {customer.name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm block">{customer.name}</span>
                <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {customer.phone || 'No phone recorded'}
                </span>
                {customer.lastReminderSentAt && (
                  <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3 text-emerald-600" />
                    Last reminder: {formatDate(customer.lastReminderSentAt)}
                    {customer.reminderCount ? ` (${customer.reminderCount} sent)` : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Outstanding Udhaar
              </span>
              <span className="text-lg font-black text-rose-600 font-mono block">
                {formatCurrency(customer.outstandingUdhaar || 0)}
              </span>
            </div>
          </div>

          {/* Input Controls */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Recipient WhatsApp Number *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9849012345 or +91 98490 12345"
                  className="w-full pl-3.5 pr-20 py-2 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-mono">
                  {cleanedRecipient ? `wa.me/${cleanedRecipient}` : 'Requires digits'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Custom Note / Due Date (Optional)
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Please clear by 30th Nov"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  UPI ID for Payment (Optional)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. storename@okaxis"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Message Live Preview Bubble */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Message Preview (Formatted for WhatsApp)</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
              </button>
            </span>

            <div className="bg-[#EFEAE2] p-3.5 rounded-2xl border border-slate-300/80 shadow-inner">
              <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200/60 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-800">
                {previewMessage}
              </div>
              <div className="flex items-center justify-between mt-1 text-[9px] text-slate-500 px-1 font-mono">
                <span>WhatsApp click-to-chat preview</span>
                <span>Ready to send</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={sending || !isEligibleForReminder}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/30 transition-all"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span>{sending ? 'Opening WhatsApp…' : 'Send WhatsApp Reminder'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
