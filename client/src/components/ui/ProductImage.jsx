import React, { useState } from 'react';
import { Package, ShoppingBag, Utensils, Coffee, Sparkles, Tag } from 'lucide-react';

const categoryColorMap = {
  Groceries: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Dairy: 'bg-amber-50 text-amber-600 border-amber-100',
  'Instant Food': 'bg-orange-50 text-orange-600 border-orange-100',
  'Snacks & Biscuits': 'bg-yellow-50 text-yellow-700 border-yellow-100',
  Beverages: 'bg-rose-50 text-rose-600 border-rose-100',
  'Edible Oils': 'bg-lime-50 text-lime-700 border-lime-100',
  Spices: 'bg-red-50 text-red-600 border-red-100',
  Household: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  'Personal Care': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  General: 'bg-slate-50 text-slate-500 border-slate-200'
};

export function ProductImage({
  src,
  alt = 'Product Image',
  category = 'General',
  className = 'w-full h-full',
  size = 'md', // sm, md, lg, xl
  aspect = 'square' // square, video, custom
}) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fallbackColor = categoryColorMap[category] || categoryColorMap.General;

  const iconSizes = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const currentIconSize = iconSizes[size] || iconSizes.md;

  if (!src || imageError) {
    return (
      <div
        className={`${className} ${fallbackColor} border flex flex-col items-center justify-center p-2 rounded-xl select-none transition-all`}
        title={alt}
      >
        <Package className={`${currentIconSize} opacity-70 stroke-[1.5]`} />
        {size !== 'xs' && size !== 'sm' && (
          <span className="text-[10px] font-semibold tracking-wider uppercase mt-1 opacity-75">
            {category}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
          <Package className="h-6 w-6 text-slate-300" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setImageError(true);
        }}
        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
}
