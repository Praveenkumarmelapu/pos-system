import React from 'react';
import {
  Sparkles,
  ShoppingBasket,
  Milk,
  Cookie,
  Soup,
  Flame,
  Droplets,
  Heart,
  Home,
  Layers,
  Coffee,
  Apple,
  Candy,
  Egg,
  Shield,
  Smile,
  Zap,
  Tag
} from 'lucide-react';

const categoryIcons = {
  All: Sparkles,
  'Grocery & Staples': ShoppingBasket,
  'Groceries': ShoppingBasket,
  'Oils & Ghee': Droplets,
  'Edible Oils': Droplets,
  'Spices & Masala': Flame,
  'Spices': Flame,
  'Fruits & Vegetables': Apple,
  'Dairy & Eggs': Milk,
  'Dairy': Milk,
  'Bakery': Cookie,
  'Biscuits & Cookies': Cookie,
  'Snacks': Cookie,
  'Snacks & Biscuits': Cookie,
  'Chocolates & Sweets': Candy,
  'Beverages': Droplets,
  'Tea & Coffee': Coffee,
  'Instant & Ready-to-Cook Food': Soup,
  'Instant Food': Soup,
  'Breakfast Foods': Egg,
  'Dry Fruits & Nuts': ShoppingBasket,
  'Personal Care': Heart,
  'Beauty & Cosmetics': Smile,
  'Household Cleaning': Home,
  'Household': Home,
  'Baby Care': Heart,
  'Pooja Essentials': Flame,
  'Stationery': Tag,
  'Others': Layers,
  'General': Layers
};

export function CategoryPills({
  categories = [],
  selectedCategory = 'All',
  onSelectCategory
}) {
  const allCategories = ['All', ...categories.filter((c) => c !== 'All')];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar select-none">
      {allCategories.map((cat) => {
        const Icon = categoryIcons[cat] || Tag;
        const isSelected = selectedCategory === cat;

        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
              isSelected
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-300' : 'text-slate-400'}`} />
            <span>{cat}</span>
          </button>
        );
      })}
    </div>
  );
}
