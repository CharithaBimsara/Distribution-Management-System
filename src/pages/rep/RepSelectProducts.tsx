import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api/productsApi';
import { orderDraftUtils, type OrderDraftItem } from '../../utils/orderDraft';
import { formatCurrency } from '../../utils/formatters';
import { calculateLine } from '../../utils/calculations';
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

  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  interface QuickRow { id: string; product?: Product; qty: number; }
  const [quickRows, setQuickRows] = useState<QuickRow[]>([]);
  const addQuickRow = () => setQuickRows(r => [...r, { id: crypto.randomUUID(), qty: 1 }]);
  const updateQuickRow = (id: string, changes: Partial<QuickRow>) => {
    setQuickRows(r => r.map(row => row.id === id ? { ...row, ...changes } : row));
  };
  const removeQuickRow = (id: string) => {
    const row = quickRows.find(r=>r.id===id);
    if (row && row.product) {
      orderDraftUtils.removeItem(row.product.id);
      setDraft(orderDraftUtils.get());
    }
    setQuickRows(r => r.filter(row => row.id !== id));
  };

  // whenever last row has a product selected, add another blank row
  useEffect(() => {
    if (quickRows.length && quickRows[quickRows.length - 1].product) {
      addQuickRow();
    }
  }, [quickRows]);

  // initialize quickRows from draft when component mounts
  useEffect(() => {
    const d = orderDraftUtils.get();
    const rows: QuickRow[] = d.items.map(i => ({
      id: crypto.randomUUID(),
      product: {
        id: i.productId,
        name: i.name,
        sku: i.sku,
        sellingPrice: i.price,
      } as Product,
      qty: i.quantity,
    }));
    if (rows.length === 0) rows.push({ id: crypto.randomUUID(), qty: 1 });
    setQuickRows(rows);
  }, []);

  // Fetch products with pagination
  const { data, isLoading } = useQuery({
    queryKey: ['rep-products-catalog', searchTerm, currentPage],
    queryFn: () => productsApi.customerCatalog({
      page: currentPage,
      pageSize: 24,
      search: searchTerm || undefined,
    }).then(r => r.data.data),
  });

  // whenever catalog data arrives, fill in missing fields (disc/tax) on existing rows
  useEffect(() => {
    if (!data) return;
    setQuickRows(rows => rows.map(r => {
      if (!r.product || r.product.discountPercent != null) return r;
      const p = data.items.find((p: Product) => p.id === r.product?.id);
      if (!p) return r;
      return { ...r, product: p };
    }));
  }, [data]);

  const getCartQty = useCallback((productId: string) => {
    return draft.items.find(i => i.productId === productId)?.quantity ?? 0;
  }, [draft.items]);

  const handleAddToCart = (product: Product) => {
    const item: OrderDraftItem = {
      productId: product.id,
      quantity: 1,
      name: product.name,
      price: product.sellingPrice,
      sku: product.sku,
      discountPercent: product.discountPercent,
      taxAmount: product.taxAmount,
      lineTotal: calculateLine({ rate: product.sellingPrice || 0, qty: 1, discountPercent: product.discountPercent, taxAmount: product.taxAmount }).total,
    };
    orderDraftUtils.addItem(item);
    setDraft(orderDraftUtils.get());
    toast.success(`Added ${product.name}`);
  };

  const syncRowItem = (row: QuickRow) => {
    if (!row.product) return;
    const prod = row.product;
    const existing = orderDraftUtils.get().items.find(i => i.productId === prod.id);
    if (existing) {
      orderDraftUtils.updateQuantity(prod.id, row.qty);
    } else {
      orderDraftUtils.addItem({
        productId: prod.id,
        quantity: row.qty,
        name: prod.name,
        price: prod.sellingPrice,
        sku: prod.sku,
        discountPercent: prod.discountPercent,
        taxAmount: prod.taxAmount,
        lineTotal: calculateLine({ rate: prod.sellingPrice || 0, qty: row.qty, discountPercent: prod.discountPercent, taxAmount: prod.taxAmount }).total,
      });
    }
    setDraft(orderDraftUtils.get());
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
  // compute quickRows total directly to reflect table values
  const quickTotal = quickRows.reduce((sum, r) => {
    if (!r.product) return sum;
    const calc = calculateLine({ rate: r.product.sellingPrice || 0, qty: r.qty, discountPercent: r.product.discountPercent, taxAmount: r.product.taxAmount });
    return sum + calc.total;
  }, 0);

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

        {/* Cart Summary Row (desktop only) */}
        <div className="hidden lg:block px-4 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <p className="text-xs text-slate-500">Browse and add items to cart</p>
            {cartCount > 0 && (
              <button
                onClick={() => {
                  /* navigate to draft or simply stay */
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="tabular-nums">{cartCount}</span>
                <span className="hidden sm:inline text-emerald-100">|</span>
                <span className="hidden sm:inline font-bold text-sm">{formatCurrency(quickTotal)}</span>
              </button>
            )}
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
                {isDesktop() ? (
                  <div className="bg-white p-4 mt-2 mb-6 rounded-xl shadow-lg overflow-x-auto">
                    <table className="w-full text-xs border border-slate-300">
                      <colgroup><col className="w-3/5"/><col className="w-1/12"/><col className="w-1/12"/><col className="w-1/8"/><col className="w-1/12"/><col className="w-1/12"/><col className="w-1/12"/><col className="w-1/12"/><col className="w-1/12"/><col className="w-12"/></colgroup>
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300">
                          <th className="text-left px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide border-r border-slate-300">Description</th>
                          <th className="text-left px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide border-r border-slate-300">Item</th>
                          <th className="text-center px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide border-r border-slate-300">Qty</th>
                          <th className="text-right px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide border-r border-slate-300">Rate</th>
                          <th className="text-right px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide border-r border-slate-300">Disc %</th>
                          <th className="text-right px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide border-r border-slate-300">Disc Amt</th>
                          <th className="text-right px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide border-r border-slate-300">Tax</th>
                          <th className="text-right px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide border-r border-slate-300">Tax Amt</th>
                          <th className="text-right px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide border-r border-slate-300">Amount</th>
                          <th className="text-center px-6 py-3 font-medium text-slate-700 text-[10px] uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {quickRows.map(row => {
                          const prod = row.product;
                          const unitAmt = prod ? prod.sellingPrice || 0 : 0;
                          let amt = 0;
                          if (prod) {
                            const calc = calculateLine({ rate: unitAmt, qty: row.qty, discountPercent: prod.discountPercent, taxAmount: prod.taxAmount });
                            amt = calc.total;
                          }
                          return (
                            <tr key={row.id} className="border-b border-slate-100">
                              <td className="px-3 py-2 border border-slate-200">
                                <select
                                  value={prod?.id || ''}
                                  onChange={e => {
                                    const p = data?.items.find((i: Product) => i.id === e.target.value);
                                    updateQuickRow(row.id, { product: p, qty: 1 });
                                    if (quickRows[quickRows.length - 1].id === row.id) addQuickRow();
                                    if (p) syncRowItem({ ...row, product: p, qty: 1 });
                                  }}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white hover:bg-slate-50 transition"
                                >
                                  <option value="">Select product</option>
                                  {data?.items.map((p: Product) => (
                                    <option key={p.id} value={p.id} className="text-xs">{p.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-3 text-slate-600 font-mono text-xs border border-slate-200">{prod?.sku || ''}</td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  value={row.qty}
                                  disabled={!prod}
                                  onChange={e => { const q = Math.max(1, parseInt(e.target.value) || 1); updateQuickRow(row.id, { qty: q }); if (prod) { syncRowItem({ ...row, qty: q }); } }}
                                  className="w-16 text-center border border-slate-300 rounded-lg px-1 py-0.5 focus:ring-1 focus:ring-orange-300"
                                />
                              </td>
                              <td className="px-3 py-2 text-right border border-slate-200">{prod ? formatCurrency(prod.sellingPrice) : ''}</td>
                              <td className="px-3 py-2 text-right border-r border-slate-200">{prod?.discountPercent ?? ''}</td>
                              <td className="px-3 py-2 text-right border-r border-slate-200">{prod?.discountAmount ? formatCurrency(prod.discountAmount) : ''}</td>
                              <td className="px-3 py-2 text-right border-r border-slate-200">{prod?.taxCode || ''}</td>
                              <td className="px-3 py-2 text-right border-r border-slate-200">{prod?.taxAmount ? formatCurrency(prod.taxAmount) : ''}</td>
                              <td className="px-6 py-3 text-right font-bold border-r border-slate-200">{prod ? formatCurrency(amt) : ''}</td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => removeQuickRow(row.id)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
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
                              {product.sku}
                            </div>
                            <div className="text-lg font-bold text-emerald-600">
                              {formatCurrency(product.sellingPrice)}
                            </div>
                            {product.brand && (
                              <div className="text-xs text-slate-400 mt-1">{product.brand}</div>
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
                )}

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
                          {item.sku} • {formatCurrency(item.price)}
                        </div>
                        {item.discountPercent != null && (
                          <div className="text-xs text-orange-600">Disc {item.discountPercent}%</div>
                        )}
                        {item.taxAmount != null && (
                          <div className="text-xs text-indigo-600">Tax {formatCurrency(item.taxAmount)}</div>
                        )}
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
                        {formatCurrency(calculateLine({ rate: item.price, qty: item.quantity, discountPercent: item.discountPercent, taxAmount: item.taxAmount }).total)}
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
