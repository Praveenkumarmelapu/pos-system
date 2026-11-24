import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle, MessageCircle, Copy, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  formatBillWhatsAppMessage,
  openWhatsAppShare,
  getWhatsAppShareUrl,
  copyToClipboard,
  cleanPhoneNumber
} from '../utils/whatsapp';
import { canShareBillFile, copyBillImageToClipboard, getBillImageCaption, shareBillAsImage } from '../utils/billImage';
import { WhatsAppIcon } from './ui/WhatsAppIcon';

export function ReceiptModal({ isOpen, onClose, sale, shop, isReprint = false }) {
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [sharing, setSharing] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (sale && isOpen) {
      setWhatsappPhone(sale.customerPhone || '');
      setCopied(false);
      setShareSuccess(false);
      setShareNote('');
      setSharing(false);
      setPhoneError('');
      setShowPreview(false);
    }
  }, [sale, isOpen]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const billMessage = formatBillWhatsAppMessage({ sale, shop });
  const cleanedPhone = cleanPhoneNumber(whatsappPhone);

  const handleCopyBill = async () => {
    const ok = await copyToClipboard(billMessage);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const flash = (msg) => {
    setShareNote(msg);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 7000);
  };

  // Nothing is saved to the phone: the bill image is shared from memory.
  const handleShareImageOptions = async () => {
    setPhoneError('');
    setSharing(true);
    try {
      const result = await shareBillAsImage({ sale, shop });
      if (result.cancelled) return;
      if (result.method === 'share') {
        flash('Bill image sent to the share sheet. Pick WhatsApp, then the customer.');
      } else {
        const copied = await copyBillImageToClipboard({ sale, shop });
        flash(copied ? 'Bill image copied. Open WhatsApp and paste it.' : 'Image sharing is not supported here. Use Copy bill text.');
      }
    } catch (err) {
      console.error('Bill image share failed:', err);
      flash('Could not prepare the bill image on this device.');
    } finally {
      setSharing(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setPhoneError('');
    // Phones that can share files: send the image straight to WhatsApp, no file saved.
    if (canShareBillFile()) {
      await handleShareImageOptions();
      return;
    }
    if (!cleanedPhone) {
      setPhoneError('Enter a customer WhatsApp number to open their chat.');
      return;
    }
    // Fallback (e.g. desktop): open the customer chat, image goes via clipboard (not saved).
    setSharing(true);
    const whatsappUrl = getWhatsAppShareUrl(cleanedPhone, getBillImageCaption({ sale, shop }));
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    try {
      const copied = await copyBillImageToClipboard({ sale, shop });
      flash(copied ? 'Customer chat opened. Paste the bill image (copied), then tap Send.' : 'Customer chat opened with the bill text.');
    } catch (err) {
      console.error('Bill image copy failed:', err);
      flash('Customer chat opened with the bill text.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Topbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <CheckCircle className="h-5 w-5" />
            <span>{isReprint ? 'Previous bill' : 'Bill generated successfully'}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 font-mono text-xs">
          {/* Printable Thermal Receipt (Hidden elements during print are avoided by styling) */}
          <div
            id="printable-receipt"
            className="w-full mx-auto p-4 border border-dashed border-slate-300 rounded-xl bg-white text-slate-800"
          >
            {/* Shop Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-sm font-bold uppercase tracking-wider">{shop?.name || 'Retail Store'}</h2>
              {shop?.address?.street && <p className="text-[11px] text-slate-600">{shop.address.street}</p>}
              {shop?.address?.city && (
                <p className="text-[11px] text-slate-600">
                  {shop.address.city}, {shop.address.state} - {shop.address.pincode}
                </p>
              )}
              {shop?.contactPhone && <p className="text-[11px] text-slate-600">Ph: {shop.contactPhone}</p>}
              {shop?.gstin && <p className="text-[11px] font-bold text-slate-700 mt-1">GSTIN: {shop.gstin}</p>}
            </div>

            {/* Bill Details */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Invoice: {sale.invoiceNumber}</span>
                <span>{sale.paymentMethod?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Date: {formatDate(sale.saleDate)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cashier: {sale.cashierName}</span>
                <span>Customer: {sale.customerName}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-200">
                <span className="w-1/2">Item</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/6 text-right">Rate</span>
                <span className="w-1/6 text-right">Total</span>
              </div>

              <div className="divide-y divide-slate-100 py-1 space-y-1">
                {sale.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] pt-1">
                    <span className="w-1/2 truncate font-sans">{item.name}</span>
                    <span className="w-1/6 text-center">{item.quantity}</span>
                    <span className="w-1/6 text-right font-sans">{formatCurrency(item.unitPrice)}</span>
                    <span className="w-1/6 text-right font-semibold font-sans">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-sans">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-sans">-{formatCurrency(sale.totalDiscount)}</span>
                </div>
              )}
              {sale.totalTax > 0 && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST:</span>
                    <span className="font-sans">+{formatCurrency(Math.round(sale.totalTax / 2))}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST:</span>
                    <span className="font-sans">+{formatCurrency(sale.totalTax - Math.round(sale.totalTax / 2))}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST Total:</span>
                    <span className="font-sans">+{formatCurrency(sale.totalTax)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-300">
                <span>GRAND TOTAL:</span>
                <span className="font-sans text-blue-600">{formatCurrency(sale.grandTotal)}</span>
              </div>

              {/* Payment & Khata Breakdown */}
              {(sale.isKhata || (sale.creditAmount && sale.creditAmount > 0)) ? (
                <div className="pt-2 text-[11px] space-y-0.5 border-t border-dashed border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Amount Paid Today:</span>
                    <span className="font-sans font-semibold text-emerald-700">{formatCurrency(sale.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Added to Khata / Udhaar:</span>
                    <span className="font-sans">+{formatCurrency(sale.creditAmount || sale.grandTotal)}</span>
                  </div>
                </div>
              ) : (
                sale.paymentMethod === 'cash' && sale.paymentDetails?.receivedAmount > 0 && (
                  <div className="pt-2 text-[11px] text-slate-600 space-y-0.5 border-t border-dashed border-slate-200">
                    <div className="flex justify-between">
                      <span>Cash Tendered:</span>
                      <span className="font-sans">{formatCurrency(sale.paymentDetails.receivedAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Change Returned:</span>
                      <span className="font-sans">{formatCurrency(sale.paymentDetails.changeReturned)}</span>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Footer Notice */}
            <div className="pt-4 text-center text-[10px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">{shop?.settings?.receiptFooter ?? 'Thank you! Visit again.'}</p>
              <p>Powered by Retail POS SaaS</p>
            </div>
          </div>

          {/* WhatsApp Digital Bill Sharing Card (Screen Only) */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-3 font-sans print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <WhatsAppIcon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Share Bill on WhatsApp</h4>
                  <p className="text-[10px] text-slate-500">Opens the customer chat and prepares the bill image</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyBill}
                className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-emerald-100"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {phoneError && (
              <p className="text-[11px] text-rose-600 font-semibold">{phoneError}</p>
            )}

            {shareSuccess && (
              <div className="p-2 bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>{shareNote || `Bill shared for #${sale.invoiceNumber}!`}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => {
                    setWhatsappPhone(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  placeholder="Customer WhatsApp # (optional)"
                  className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={sharing}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all shrink-0"
              >
                {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WhatsAppIcon className="h-3.5 w-3.5" />}
                <span>{sharing ? 'Making...' : 'Send'}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={handleShareImageOptions}
              disabled={sharing}
              className="text-[10px] text-emerald-800 underline underline-offset-2 font-semibold disabled:opacity-60"
            >
              Share image (choose WhatsApp contact)
            </button>

            {/* Toggle WhatsApp message preview */}
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 transition-colors"
              >
                {showPreview ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <span>{showPreview ? 'Hide message text' : 'Preview message text'}</span>
              </button>

              {showPreview && (
                <div className="mt-2 p-2.5 bg-white rounded-xl border border-emerald-200 text-[10px] font-sans text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                  {billMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 font-sans print:hidden">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={sharing}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center shrink-0"
            title="Open customer WhatsApp chat and prepare bill image"
            aria-label="Open customer WhatsApp chat and prepare bill image"
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-100"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
