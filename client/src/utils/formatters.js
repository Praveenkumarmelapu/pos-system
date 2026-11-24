/**
 * INR Currency & Date/Time formatting utilities
 */

export function formatCurrency(paiseOrRupees, isPaise = true) {
  const rupees = isPaise ? (paiseOrRupees || 0) / 100 : (paiseOrRupees || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rupees);
}

export function formatNumber(val) {
  return new Intl.NumberFormat('en-IN').format(val || 0);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).format(new Date(dateString));
}

export const formatDateTime = formatDate;
