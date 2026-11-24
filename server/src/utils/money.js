/**
 * Currency and Monetary calculation utilities using minor units (Paise).
 * Prevents JavaScript IEEE 754 floating point arithmetic issues (e.g., 0.1 + 0.2 !== 0.3).
 * ₹1.00 = 100 Paise
 */

export function rupeesToPaise(rupees) {
  if (rupees === null || rupees === undefined) return 0;
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function paiseToRupees(paise) {
  if (paise === null || paise === undefined) return 0;
  return (paise / 100).toFixed(2);
}

export function formatINR(paise) {
  const val = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(val);
}
