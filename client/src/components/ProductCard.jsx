import React from 'react';
import { Plus, Check } from 'lucide-react';
import { ProductImage } from './ui/ProductImage';
import { formatCurrency } from '../utils/formatters';

export function ProductCard({ product, onAddToCart, cartQuantity = 0 }) {
  const isOutOfStock = product.stockQuantity <= 0;
  const hasDiscount = product.mrp && product.mrp > product.sellingPrice;

  return (
    <div
      onClick={() => { if (!isOutOfStock) onAddToCart(product); }}
      className={`group relative bg-surface-card rounded-lg border flex flex-col justify-between transition-all duration-150 select-none overflow-hidden ${
        isOutOfStock
          ? 'opacity-50 cursor-not-allowed border-border bg-surface-muted'
          : 'cursor-pointer border-border hover:border-action hover:shadow-card-hover active:scale-[0.98]'
      }`}
    >
      {/* Image Area */}
      <div className="relative w-full aspect-square overflow-hidden bg-surface-muted">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          category={product.category}
          className="w-full h-full object-cover"
          size="lg"
        />

        {/* Cart badge top-right */}
        {cartQuantity > 0 && (
          <div className="absolute top-1.5 right-1.5 z-10 h-5 px-1.5 rounded-full bg-action text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
            {cartQuantity}×
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-[10px] font-bold text-danger bg-white px-2 py-0.5 rounded-full border border-red-200">
              Out of Stock
            </span>
          </div>
        )}

        {/* Low stock warning */}
        {!isOutOfStock && product.stockQuantity <= product.minStockThreshold && (
          <div className="absolute top-1.5 left-1.5 z-10 h-4 px-1.5 rounded-full bg-warning text-white text-[9px] font-bold flex items-center">
            Low
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-2.5 flex flex-col gap-1.5">
        {/* Brand / Category label */}
        <div className="text-[10px] text-txt-secondary font-medium truncate">
          {product.brand || product.category}{product.packSize ? ` · ${product.packSize}` : ''}
        </div>

        {/* Product Name */}
        <h4
          className="text-xs font-semibold text-txt line-clamp-2 leading-snug group-hover:text-action transition-colors"
          title={product.name}
        >
          {product.name}
        </h4>

        {/* Price Row + Add Button */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-border mt-0.5">
          <div>
            <span className="text-sm font-bold font-mono text-txt tracking-tight">
              {formatCurrency(product.sellingPrice)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-txt-muted line-through ml-1 font-mono">
                {formatCurrency(product.mrp)}
              </span>
            )}
            <div className="text-[9px] text-txt-muted -mt-0.5">
              per {product.unit || 'pcs'}
            </div>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              if (!isOutOfStock) onAddToCart(product);
            }}
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-all shrink-0 ${
              cartQuantity > 0
                ? 'bg-action text-white shadow-xs'
                : 'bg-surface-muted text-txt-secondary hover:bg-action hover:text-white'
            }`}
            title={cartQuantity > 0 ? 'Add another' : 'Add to cart'}
          >
            {cartQuantity > 0 ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
