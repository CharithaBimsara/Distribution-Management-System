import React, { useState } from 'react';
import { Plus, Check, Eye } from 'lucide-react';
import type { Product } from '../../types/product.types';
import { formatCurrency } from '../../utils/formatters';

type Props = {
  product: Product;
  added?: boolean;
  onAdd: (p: Product) => void;
  onQuickView?: (p: Product) => void;
};

export default function ProductCard({ product, added, onAdd, onQuickView }: Props) {
  const [isPopping, setIsPopping] = useState(false);

  return (
    <article
      className="group relative bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-transform duration-200"
      aria-labelledby={`prod-${product.id}-title`}
    >
      {/* Image/icon removed by request — keep card compact. Quick-view button remains. */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onQuickView?.(product); }}
          aria-label={`Quick view ${product.name}`}
          className="p-2 bg-white/90 text-slate-600 rounded-xl shadow-sm hover:scale-105 transition"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 md:p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={`prod-${product.id}-title`} className="text-sm md:text-sm font-semibold text-slate-900 leading-tight line-clamp-2">
              {product.name}
            </h3>
            <p className="text-[11px] md:text-xs text-slate-400 mt-1 truncate">{product.unit} • {product.brand || 'Generic'}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm md:text-base font-bold text-orange-600">{formatCurrency(product.sellingPrice)}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{product.availability}</div>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {/* placeholder for rating / badges if available */}
            <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-full">{product.stockQuantity} in stock</span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setIsPopping(true); onAdd(product); setTimeout(() => setIsPopping(false), 420); }}
            aria-label={`Add ${product.name} to cart`}
            className={`flex items-center gap-2 justify-center px-2 py-2 rounded-md md:rounded-xl text-white text-sm font-semibold transition-shadow shadow-sm active:scale-95 sparkle ${isPopping ? 'animate-pop sparkle-on' : ''} ${
              added ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-gradient-to-br from-orange-500 to-rose-500 shadow-orange-500/25 hover:shadow-md'
            }`}
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden md:inline-block">{added ? 'Added' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
