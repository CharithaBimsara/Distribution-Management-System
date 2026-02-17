import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { Product } from '../../types/product.types';
import { formatCurrency } from '../../utils/formatters';
import { X, ShoppingCart } from 'lucide-react';

type Props = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAdd: (p: Product) => void;
};

export default function ProductQuickView({ product, open, onClose, onAdd }: Props) {
  const [isPopping, setIsPopping] = useState(false);
  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Desktop modal centered, mobile bottom sheet */}
      <div className="fixed left-1/2 top-12 -translate-x-1/2 w-full max-w-3xl mx-auto lg:rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{product.name}</h3>
              <p className="text-xs text-slate-400">{product.brand || 'Generic'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-orange-600">{formatCurrency(product.sellingPrice)}</div>
            <button onClick={onClose} className="p-2 rounded-md text-slate-500 hover:bg-slate-50">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg bg-slate-50 overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-56 object-contain bg-white" />
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-300">No image</div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">{product.description || 'No description available.'}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => {
                const outOfStock = product.availability !== 'InStock' || (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0);
                if (outOfStock && !product.allowBackorder) {
                  toast.error('Product is out of stock');
                  return;
                }
                // if backorder would occur show confirmation inside modal
                if (outOfStock && product.allowBackorder) {
                  // open a simple confirm dialog
                  if (!confirm(`Only ${product.stockQuantity ?? 0} in stock — the rest will be backordered. ETA ${product.backorderLeadTimeDays ?? 'TBD'} days. Continue?`)) return;
                }
                setIsPopping(true); onAdd(product); setTimeout(() => setIsPopping(false), 420);
              }} className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-xl shadow-md sparkle ${isPopping ? 'animate-pop sparkle-on' : ''}`}>
                <ShoppingCart className="w-4 h-4" /> Add to cart
              </button>
              <div className="text-sm text-slate-500">Unit: <span className="font-semibold text-slate-700">{product.unit}</span></div>
            </div>
            <div className="text-xs text-slate-400">Availability: <span className="ml-1 text-slate-700">{product.availability} • {product.stockQuantity} left</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
