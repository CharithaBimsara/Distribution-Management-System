import React, { useState } from 'react';
import toast from 'react-hot-toast';
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleAdd = () => {
    const outOfStock = product.availability !== 'InStock' || (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0);
    if (outOfStock && product.allowBackorder) {
      setConfirmOpen(true);
      return;
    }

    if (outOfStock) {
      toast.error('Product is out of stock');
      return;
    }

    setIsPopping(true);
    onAdd(product);
    setTimeout(() => setIsPopping(false), 420);
  };

  // Image/icon removed by request — keep card compact. Quick-view button remains.
  return (
    <article className="group relative bg-white rounded-2xl border border-slate-100 hover:shadow-md transition">
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
            <h3 id={`prod-${product.id}-title`} className={`${(product.name || '').length > 12 ? 'line-clamp-2' : 'truncate'} text-sm md:text-base font-semibold text-slate-900 leading-tight`}>
              {product.name}
            </h3>

            <p className={`${(product.description || '').length > 12 ? 'line-clamp-2' : 'truncate'} text-[11px] md:text-xs text-slate-400 mt-1`}>
              {product.description}
            </p>

            <p className="text-[11px] text-slate-500 mt-2">
              {product.unit} : {product.availability === 'InStock' ? 'In stock' : product.availability === 'OutOfStock' ? 'Out of stock' : product.availability} : {product.stockQuantity}
            </p>

            {product.allowBackorder && (product.stockQuantity ?? 0) <= 0 && (
              <div className="text-[11px] text-emerald-600 mt-1">Available to order — lead time {product.backorderLeadTimeDays ?? 'TBD'} days</div>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-sm md:text-base font-bold text-orange-600">{formatCurrency(product.sellingPrice)}</div>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <div />

          <button
            onClick={(e) => { e.stopPropagation(); handleAdd(); }}
            aria-label={`Add ${product.name} to cart`}
            className={`flex items-center gap-2 justify-center px-2 py-2 rounded-md md:rounded-xl text-white text-sm font-semibold transition-shadow shadow-sm active:scale-95 sparkle ${isPopping ? 'animate-pop sparkle-on' : ''} ${
              added ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-gradient-to-br from-orange-500 to-rose-500 shadow-orange-500/25 hover:shadow-md'
            }`}
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden md:inline-block">{added ? 'Added' : 'Add'}</span>
          </button>

          {/* Backorder confirmation modal */}
          {confirmOpen && (
            <div className="fixed inset-0 z-40 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" onClick={() => setConfirmOpen(false)} />
              <div className="bg-white rounded-2xl p-4 z-50 w-[92vw] max-w-sm">
                <h3 className="text-sm font-bold text-slate-900">Confirm backorder</h3>
                <p className="text-xs text-slate-600 mt-2">Only {product.stockQuantity ?? 0} in stock — the rest will be backordered. ETA {product.backorderLeadTimeDays ?? 'TBD'} days. Continue?</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setConfirmOpen(false)} className="px-3 py-2 rounded-xl border text-sm">Cancel</button>
                  <button onClick={() => { setConfirmOpen(false); setIsPopping(true); onAdd(product); setTimeout(() => setIsPopping(false), 420); }} className="px-3 py-2 rounded-xl bg-orange-500 text-white text-sm">Confirm</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
