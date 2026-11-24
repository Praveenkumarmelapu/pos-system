/**
 * WhatsApp Integration Utilities for Retail POS SaaS
 * Provides message formatting and sharing for:
 * 1. Digital Bill / Receipt sharing
 * 2. Customer Khata / Udhaar payment reminders
 */

/**
 * Standardize and clean phone numbers for WhatsApp wa.me links
 * Strips non-digit characters and ensures country code (default 91 for India if 10 digits)
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  // 10-digit Indian mobile number (e.g., 9849012345) -> prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // 11 digits starting with 0 (e.g., 09849012345) -> remove 0 and prepend 91
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  // Already has country code (e.g. 919849012345 or other country code)
  return digits;
}

/**
 * Format a human-friendly currency string from paise
 */
function formatRupees(paise) {
  const num = (Number(paise || 0) / 100).toFixed(2);
  return `₹${num}`;
}

/**
 * Format an invoice/sale receipt as a clean, structured WhatsApp message
 */
export function formatBillWhatsAppMessage({ sale, shop }) {
  if (!sale) return '';

  const shopName = (shop?.name || 'Retail Store').toUpperCase();
  const addressParts = [
    shop?.address?.street,
    shop?.address?.city,
    shop?.address?.state
  ].filter(Boolean);

  let msg = `🧾 *INVOICE: #${sale.invoiceNumber}*\n`;
  msg += `🏪 *${shopName}*\n`;

  if (addressParts.length > 0) {
    msg += `📍 ${addressParts.join(', ')}\n`;
  }
  if (shop?.contactPhone) {
    msg += `📞 Ph: ${shop.contactPhone}\n`;
  }
  if (shop?.gstin) {
    msg += `🏛️ GSTIN: ${shop.gstin}\n`;
  }

  msg += `─────────────────────────\n`;

  const saleDateFormatted = new Date(sale.saleDate || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  msg += `📅 *Date:* ${saleDateFormatted}\n`;
  if (sale.customerName && sale.customerName !== 'Walk-in Customer') {
    msg += `👤 *Customer:* ${sale.customerName}\n`;
  }
  if (sale.cashierName) {
    msg += `🧑‍💼 *Cashier:* ${sale.cashierName}\n`;
  }
  msg += `💳 *Payment Mode:* ${(sale.paymentMethod || 'cash').toUpperCase()}\n`;
  msg += `─────────────────────────\n`;

  // Itemized product list
  msg += `*ITEMS:* \n`;
  const items = sale.items || [];
  if (items.length > 0) {
    items.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.name}*\n   Qty: ${item.quantity} × ${formatRupees(item.unitPrice)} = *${formatRupees(item.lineTotal)}*\n`;
    });
  } else {
    msg += `Items listed on thermal receipt\n`;
  }

  msg += `─────────────────────────\n`;
  msg += `Subtotal: ${formatRupees(sale.subtotal)}\n`;

  if (sale.totalDiscount > 0) {
    msg += `Discount: -${formatRupees(sale.totalDiscount)}\n`;
  }
  if (sale.totalTax > 0) {
    msg += `GST Total: +${formatRupees(sale.totalTax)}\n`;
  }

  msg += `*GRAND TOTAL: ${formatRupees(sale.grandTotal)}*\n`;

  // Khata / Udhaar breakdown
  if (sale.isKhata || (sale.creditAmount && sale.creditAmount > 0)) {
    msg += `Amount Paid: ${formatRupees(sale.paidAmount || 0)}\n`;
    msg += `*Added to Khata (Udhaar): ${formatRupees(sale.creditAmount || sale.grandTotal)}*\n`;
  } else if (sale.paymentMethod === 'cash' && sale.paymentDetails?.receivedAmount > 0) {
    msg += `Cash Tendered: ${formatRupees(sale.paymentDetails.receivedAmount)}\n`;
    msg += `Change Returned: ${formatRupees(sale.paymentDetails.changeReturned)}\n`;
  }

  msg += `─────────────────────────\n`;
  const footer = shop?.settings?.receiptFooter || 'Thank you! Visit again.';
  msg += `_${footer}_\n`;
  msg += `_Sent via ${shopName} POS_`;

  return msg;
}

/**
 * Format a polite and professional Khata / Udhaar payment reminder message
 */
export function formatKhataReminderWhatsAppMessage({ customer, shop, customNote = '', upiId = '' }) {
  if (!customer) return '';

  const shopName = shop?.name || 'Our Store';
  const balanceStr = formatRupees(customer.outstandingUdhaar || 0);
  const todayStr = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium'
  });

  let msg = `🙏 *Namaste ${customer.name} ji,*\n\n`;
  msg += `This is a friendly reminder from *${shopName}* regarding your store Khata (credit) account.\n\n`;
  msg += `💰 *Current Outstanding Balance: ${balanceStr}*\n`;
  msg += `📅 *As of:* ${todayStr}\n\n`;

  if (customNote && customNote.trim()) {
    msg += `📝 *Note:* ${customNote.trim()}\n\n`;
  }

  if (upiId && upiId.trim()) {
    msg += `📱 *Pay via UPI:* \`${upiId.trim()}\`\n\n`;
  }

  msg += `Kindly clear the outstanding dues at your earliest convenience. You can pay via UPI or cash directly at the counter.\n\n`;

  if (shop?.contactPhone) {
    msg += `📞 Store Phone: ${shop.contactPhone}\n`;
  }

  msg += `_Thank you for your continuous support and patronage!_`;

  return msg;
}

/**
 * Build the universal WhatsApp Click-to-Chat URL
 */
export function getWhatsAppShareUrl(phone, text) {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text || '');

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Open WhatsApp Click-to-Chat in a new browser tab/window
 */
export function openWhatsAppShare(phone, text) {
  const url = getWhatsAppShareUrl(phone, text);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed, using textarea fallback:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}
