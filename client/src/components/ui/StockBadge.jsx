import React from 'react';

export function StockBadge({ quantity, minThreshold = 5, unit = 'pcs', showQuantity = true }) {
  const isOutOfStock = quantity <= 0;
  const isLowStock = !isOutOfStock && quantity <= minThreshold;

  if (isOutOfStock) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
        Out of Stock
      </span>
    );
  }

  if (isLowStock) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
        {showQuantity ? `Low (${quantity} ${unit})` : 'Low Stock'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
      {showQuantity ? `${quantity} in stock` : 'In Stock'}
    </span>
  );
}
