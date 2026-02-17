import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api/productsApi';
import { orderDraftUtils, type OrderDraftItem } from '../../utils/orderDraft';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Search, ShoppingCart, Plus, Minus, Package, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Product } from '../../types/product.types';

export default function RepSelectProducts() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [draft, setDraft] = useState(orderDraftUtils.get());

  // Fetch products with pagination
  const { data, isLoading } = useQuery({
    queryKey: ['rep-products-catalog', searchTerm, currentPage],
    queryFn: () => productsApi.customerCatalog({
      page: currentPage,
      pageSize: 24,
      search: searchTerm || undefined,
      availability: 'InStock',
    }).then(r => r.data.data),
  });

  const getCartQty = useCallback((productId: string) => {
    return draft.items.find(i => i.productId === productId)?.quantity ?? 0;
  }, [draft.items]);

  const handleAddToCart = (product: Product) => {
    const item: OrderDraftItem = {
      productId: product.id,
      quantity: 1,
      name: product.name,
      price: product.sellingPrice,
      unit: product.unit,
      sku: product.sku,
    };
    orderDraftUtils.addItem(item);
    setDraft(orderDraftUtils.get());
    toast.success(`Added ${product.name}`);
  };

  const handleIncrement = (product: Product) => {
    const qty = getCartQty(product.id);
    if (qty > 0) {
      orderDraftUtils.updateQuantity(product.id, qty + 1);
      setDraft(orderDraftUtils.get());
    } else {
      handleAddToCart(product);
    }
  };

  const handleDecrement = (productId: string) => {
    const qty = getCartQty(productId);
    if (qty > 1) {
      orderDraftUtils.updateQuantity(productId, qty - 1);
      setDraft(orderDraftUtils.get());
    } else if (qty === 1) {
      orderDraftUtils.removeItem(productId);
      setDraft(orderDraftUtils.get());
      toast.success('Removed from cart');
    }
  };

  const handleRemoveItem = (productId: string) => {
    orderDraftUtils.removeItem(productId);
    setDraft(orderDraftUtils.get());
    toast.success('Removed from cart');
  };

  const cartCount = orderDraftUtils.getItemCount();
  const cartTotal = orderDraftUtils.getTotal();

  return (
    <div className="animate-fade-in pb-20">
      <div className="px-4 lg:px-6 pt-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">Add Products</h1>
            <p className="text-sm text-slate-500 mt-0.5">Browse and add items to cart</p>
          </div>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition">
            Done
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search products by name, SKU, or brand..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-emerald-500 text-base"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-slate-500 mt-3">Loading products...</div>
          </div>
        )}

        {/* Product Grid */}
        {!isLoading && data && (
          <>
            {data.items.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <div className="text-lg font-semibold text-slate-700">No products found</div>
                <div className="text-sm text-slate-500 mt-2">Try adjusting your search</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  {data.items.map((product: Product) => {
                    const qty = getCartQty(product.id);
                    return (
                      <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col hover:shadow-md transition">
                        {/* Product Info */}
                        <div className="flex-1 mb-3">
                          <h3 className="text-base font-bold text-slate-900 line-clamp-2 mb-1">
                            {product.name}
                          </h3>
                          <div className="text-xs text-slate-500 mb-2">
                            {product.sku} • {product.unit}
                          </div>
                          <div className="text-lg font-bold text-emerald-600">
                            {formatCurrency(product.sellingPrice)}
                          </div>
                          {product.brand && (
                            <div className="text-xs text-slate-400 mt-1">{product.brand}</div>
                          )}
                        </div>

                        {/* Availability Badge */}
                        <div className="mb-3">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-lg ${
                            product.availability === 'InStock'
                              ? 'bg-emerald-100 text-emerald-700'
                              : product.availability === 'LowStock'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {product.availability === 'InStock' ? '✓ In Stock' : product.availability}
                          </span>
                          {typeof product.stockQuantity === 'number' && (
                            <span className="ml-2 text-xs text-slate-500">({product.stockQuantity} available)</span>
                          )}
                        </div>

                        {/* Add to Cart / Quantity Controls */}
                        {qty === 0 ? (
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="w-full py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add to Cart
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDecrement(product.id)}
                              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center"
                            >
                              <Minus className="w-4 h-4 text-slate-700" />
                            </button>
                            <div className="px-4 py-2.5 bg-emerald-50 border-2 border-emerald-600 rounded-xl font-bold text-emerald-700 min-w-[3rem] text-center">
                              {qty}
                            </div>
                            <button
                              onClick={() => handleIncrement(product)}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center justify-center"
                            >
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg text-sm font-semibold transition ${
                              currentPage === page
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      {data.totalPages > 5 && <span className="px-2 text-slate-400">...</span>}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={currentPage === data.totalPages}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 bg-emerald-600 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-700 transition flex items-center gap-3 z-50"
        >
          <ShoppingCart className="w-6 h-6" />
          <div className="pr-2">
            <div className="text-xs font-semibold">Cart • {cartCount} items</div>
            <div className="text-sm font-bold">{formatCurrency(cartTotal)}</div>
          </div>
          {cartCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
              {cartCount}
            </div>
          )}
        </button>
      )}

      {/* Cart Drawer/Modal */}
      {cartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center" onClick={() => setCartOpen(false)}>
          <div className="bg-white w-full md:max-w-2xl md:rounded-3xl md:max-h-[85vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Your Cart</h2>
                <p className="text-sm text-slate-500 mt-0.5">{cartCount} items • {formatCurrency(cartTotal)}</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {draft.items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <div className="text-lg font-semibold text-slate-700">Cart is empty</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {item.sku} • {formatCurrency(item.price)}/{item.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDecrement(item.productId)}
                          className="w-8 h-8 bg-white border border-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="w-12 text-center font-bold text-slate-900">{item.quantity}</div>
                        <button
                          onClick={() => {
                            orderDraftUtils.updateQuantity(item.productId, item.quantity + 1);
                            setDraft(orderDraftUtils.get());
                          }}
                          className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-700"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <div className="text-sm font-bold text-slate-900 w-24 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-slate-700">Total</span>
                <span className="text-2xl font-bold text-emerald-600">{formatCurrency(cartTotal)}</span>
              </div>
              <button
                onClick={() => { setCartOpen(false); navigate('/rep/orders/new'); }}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition"
              >
                Continue to Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
