import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { productsApi } from '../../services/api/productsApi';
import { addToCart } from '../../store/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import { Search, Package, Plus, Check, SlidersHorizontal, ShoppingBag } from 'lucide-react';
import type { Product } from '../../types/product.types';
import toast from 'react-hot-toast';

import ProductCard from '../../components/product/ProductCard';
import ProductQuickView from '../../components/product/ProductQuickView';

export default function CustomerProducts() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const dispatch = useDispatch();

  const { data, isLoading } = useQuery({
    queryKey: ['customer-products', page, search],
    queryFn: () => productsApi.customerCatalog({ page, pageSize: 20, search: search || undefined }).then(r => r.data.data),
  });

  const handleAddToCart = (product: Product) => {
    dispatch(addToCart({
      productId: product.id,
      productName: product.name,
      unitPrice: product.sellingPrice,
      quantity: 1,
      unit: product.unit,
      imageUrl: product.imageUrl,
    }));
    setAddedIds(prev => new Set(prev).add(product.id));
    toast.success(`${product.name} added to cart`);
    setTimeout(() => setAddedIds(prev => { const next = new Set(prev); next.delete(product.id); return next; }), 1500);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white px-5 pt-5 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Shop</h1>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium backdrop-blur-sm">
            {data?.totalCount || 0} products
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl text-sm text-white placeholder-orange-200 focus:bg-white/25 focus:border-white/40 outline-none transition"
          />
        </div>
      </div>

      <div className="px-4 -mt-5 pb-6">
        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="h-16 md:h-28 lg:h-32 bg-slate-100 skeleton" />
                <div className="p-2 md:p-3 space-y-1.5 md:space-y-2">
                  <div className="h-3 md:h-3.5 bg-slate-100 rounded-full w-3/4 skeleton" />
                  <div className="h-2.5 md:h-3 bg-slate-100 rounded-full w-1/2 skeleton" />
                  <div className="flex justify-between items-center pt-1">
                    <div className="h-3 md:h-4 bg-slate-100 rounded-full w-12 md:w-16 skeleton" />
                    <div className="w-7 aspect-square md:w-8 bg-slate-100 rounded-full skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !data?.items?.length ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Package className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 product-entrance stagger-children">
              {data.items.map((product: Product, idx: number) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  added={addedIds.has(product.id)}
                  onAdd={handleAddToCart}
                  onQuickView={(p) => setQuickViewProduct(p)}
                />
              ))}
            </div>

            {/* Quick View modal */}
            <ProductQuickView
              product={quickViewProduct}
              open={!!quickViewProduct}
              onClose={() => setQuickViewProduct(null)}
              onAdd={(p) => { handleAddToCart(p); setQuickViewProduct(null); }}
            />

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-5">
                <span className="text-xs text-slate-400 font-medium">Page {page} of {data.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= data.totalPages}
                    className="px-4 py-2 text-xs font-medium bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl disabled:opacity-40 hover:shadow-md active:scale-95 transition-all shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
