import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api/productsApi';
import { customersApi } from '../../services/api/customersApi';
import { orderDraftUtils, type OrderDraftItem } from '../../utils/orderDraft';
import { formatCurrency } from '../../utils/formatters';
import { calculateLine } from '../../utils/calculations';
import { ArrowLeft, Search, ShoppingCart, Plus, Minus, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Product } from '../../types/product.types';
import { useIsDesktop } from '../../hooks/useMediaQuery';

export default function RepSelectProducts() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState(orderDraftUtils.get());
  const isDesktop = useIsDesktop();

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

  const selectedCustomerId = draft.customerId;
  const { data: selectedCustomerData } = useQuery({
    queryKey: ['rep-selected-customer', selectedCustomerId],
    queryFn: () => customersApi.repGetById(selectedCustomerId!).then(r => r.data.data),
    enabled: !!selectedCustomerId,
  });
  const isNonTaxCustomer = ((selectedCustomerData?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax');

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
      mrp: product.mrp,
      discountPercent: product.discountPercent,
      taxCode: product.taxCode,
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
    const effectiveTaxAmount = isNonTaxCustomer ? 0 : prod.taxAmount;
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
        mrp: prod.mrp,
        discountPercent: prod.discountPercent,
        taxCode: prod.taxCode,
        taxAmount: effectiveTaxAmount,
        lineTotal: calculateLine({ rate: prod.sellingPrice || 0, qty: row.qty, discountPercent: prod.discountPercent, taxAmount: effectiveTaxAmount }).total,
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

  const cartCount = orderDraftUtils.getItemCount();
  const cartTotal = orderDraftUtils.getTotal();
  // compute quickRows total directly to reflect table values
  const quickTotal = quickRows.reduce((sum, r) => {
    if (!r.product) return sum;
    const calc = calculateLine({
      rate: r.product.sellingPrice || 0,
      qty: r.qty,
      discountPercent: r.product.discountPercent,
      taxAmount: isNonTaxCustomer ? 0 : r.product.taxAmount,
    });
    return sum + calc.total;
  }, 0);

  return (
    <div className="animate-fade-in pb-24 md:pb-28 lg:pb-20">
      <div className="px-4 md:px-5 lg:px-6 pt-4 md:pt-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 md:mb-6">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 w-fit">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-2xl font-bold text-slate-900">Add Products</h1>
            <p className="text-sm md:text-base lg:text-sm text-slate-500 mt-1">Browse the catalog and add items to your order</p>
          </div>
          <button onClick={() => navigate(-1)} className="w-full sm:w-auto px-4 py-3.5 md:py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition text-sm">
            Continue
          </button>
        </div>

        {!isDesktop && (
          <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5 md:mb-6">
            <MiniStat label="Items" value={String(cartCount)} />
            <MiniStat label="Page" value={String(data?.items?.length || 0)} tone="green" />
            <MiniStat label="Total" value={formatCurrency(quickTotal)} tone="emerald" />
          </div>
        )}

        {/* Search Bar - Sticky on scroll */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 p-4 mb-5 md:mb-6 -mx-4 md:-mx-5 lg:-mx-6 px-4 md:px-5 lg:px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by product name, SKU, or brand..."
              className="w-full pl-10 pr-4 py-3.5 md:py-3 border border-slate-300 rounded-xl outline-emerald-500 text-base placeholder-slate-400"
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
          <div className="text-center py-16 md:py-20">
            <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-slate-500 mt-4">Loading products...</div>
          </div>
        )}

        {/* Product Grid */}
        {!isLoading && data && (
          <>
            {data.items.length === 0 ? (
              <div className="text-center py-16 md:py-20">
                <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <div className="text-lg md:text-xl font-semibold text-slate-700">No products found</div>
                <div className="text-sm text-slate-500 mt-2">Try adjusting your search</div>
              </div>
            ) : (
              <>
                {isDesktop ? (
                  <div className="bg-white p-4 mt-2 mb-6 rounded-xl shadow-lg overflow-x-auto">
                    <table className="w-full table-auto text-[11px] border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300">
                          <th className="text-left px-3 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Description</th>
                          <th className="whitespace-nowrap text-left px-3 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Item</th>
                          <th className="whitespace-nowrap text-center px-3 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Qty</th>
                          <th className="whitespace-nowrap text-right px-3 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Rate</th>
                          <th className="whitespace-nowrap text-right px-3 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Disc %</th>
                          <th className="whitespace-nowrap text-right px-3 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Disc Amt</th>
                          {!isNonTaxCustomer && <th className="whitespace-nowrap text-right px-3 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Tax</th>}
                          {!isNonTaxCustomer && <th className="whitespace-nowrap text-right px-3 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Tax Amt</th>}
                          <th className="whitespace-nowrap text-right px-3 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Amount</th>
                          <th className="whitespace-nowrap text-center px-2 py-2 font-medium text-slate-700 text-[9px] uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {quickRows.map(row => {
                          const prod = row.product;
                          const unitAmt = prod ? prod.sellingPrice || 0 : 0;
                          let amt = 0;
                          if (prod) {
                            const calc = calculateLine({
                              rate: unitAmt,
                              qty: row.qty,
                              discountPercent: prod.discountPercent,
                              taxAmount: isNonTaxCustomer ? 0 : prod.taxAmount,
                            });
                            amt = calc.total;
                          }
                          return (
                            <tr key={row.id} className="border-b border-slate-100">
                              <td className="px-2 py-1.5 border border-slate-200 min-w-[260px]">
                                <select
                                  value={prod?.id || ''}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const p = ((data?.items || []) as Product[]).find((item) => item.id === selectedId);
                                    if (!p) return;
                                    updateQuickRow(row.id, { product: p, qty: 1 });
                                    if (quickRows[quickRows.length - 1].id === row.id) addQuickRow();
                                    syncRowItem({ ...row, product: { ...p, taxAmount: isNonTaxCustomer ? 0 : p.taxAmount }, qty: 1 });
                                  }}
                                  className="w-full border border-slate-300 rounded-md px-2 py-1 bg-white text-[11px]"
                                >
                                  <option value="">Select product</option>
                                  {((data?.items || []) as Product[]).map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.name} ({option.sku})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-1.5 text-slate-600 font-mono text-[10px] border border-slate-200 whitespace-nowrap">{prod?.sku || ''}</td>
                              <td className="px-2 py-1.5 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  value={row.qty}
                                  disabled={!prod}
                                  onChange={e => { const q = Math.max(1, parseInt(e.target.value) || 1); updateQuickRow(row.id, { qty: q }); if (prod) { syncRowItem({ ...row, qty: q }); } }}
                                  className="w-14 text-center text-[11px] border border-slate-300 rounded-md px-1 py-0.5 focus:ring-1 focus:ring-orange-300"
                                />
                              </td>
                              <td className="px-3 py-1.5 text-right border border-slate-200 whitespace-nowrap">{prod ? formatCurrency(prod.sellingPrice) : ''}</td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 whitespace-nowrap">{prod?.discountPercent ?? ''}</td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 whitespace-nowrap">{prod?.discountAmount ? formatCurrency(prod.discountAmount) : ''}</td>
                              {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right border-r border-slate-200 whitespace-nowrap">{prod?.taxCode || ''}</td>}
                              {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right border-r border-slate-200 whitespace-nowrap">{prod?.taxAmount ? formatCurrency(prod.taxAmount) : ''}</td>}
                              <td className="px-3 py-1.5 text-right font-bold border-r border-slate-200 whitespace-nowrap">{prod ? formatCurrency(amt) : ''}</td>
                              <td className="px-2 py-1.5 text-center">
                                <button onClick={() => removeQuickRow(row.id)} className="text-red-500 hover:text-red-700 text-[11px]">✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-6 md:mb-8">
                    {data.items.map((product: Product) => {
                      const qty = getCartQty(product.id);
                      return (
                        <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-5 flex flex-col hover:shadow-md hover:border-emerald-200 transition-all active:scale-95">
                          {/* Product Info */}
                          <div className="flex-1 mb-4">
                            <h3 className="text-lg md:text-base font-bold text-slate-900 line-clamp-2 mb-2">
                              {product.name}
                            </h3>
                            <div className="text-sm text-slate-500 mb-3 font-mono">
                              {product.sku}
                            </div>
                            <div className="text-2xl md:text-xl font-bold text-emerald-600 mb-2">
                              {formatCurrency(product.sellingPrice)}
                            </div>
                            {product.brand && (
                              <div className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg w-fit">
                                {product.brand}
                              </div>
                            )}
                          </div>

                          {/* Add to Cart / Quantity Controls */}
                          {qty === 0 ? (
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="w-full py-4 md:py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2 active:scale-95"
                            >
                              <Plus className="w-5 h-5" />
                              Add to Cart
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDecrement(product.id)}
                                className="flex-1 py-4 md:py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center active:scale-95"
                              >
                                <Minus className="w-5 h-5 text-slate-700" />
                              </button>
                              <div className="px-4 py-4 md:py-3 bg-emerald-50 border-2 border-emerald-600 rounded-xl font-bold text-emerald-700 min-w-[4.5rem] md:min-w-[3.25rem] text-center text-lg md:text-base">
                                {qty}
                              </div>
                              <button
                                onClick={() => handleIncrement(product)}
                                className="flex-1 py-4 md:py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center justify-center active:scale-95"
                              >
                                <Plus className="w-5 h-5 text-white" />
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
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-8 md:mt-10">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-full sm:w-auto px-4 py-3 md:py-2 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                      ← Previous
                    </button>
                    <div className="hidden md:flex items-center gap-1">
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
                    <div className="md:hidden text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg px-4 py-2">
                      {currentPage} / {data.totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={currentPage === data.totalPages}
                      className="w-full sm:w-auto px-4 py-3 md:py-2 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>


      {!isDesktop && cartCount > 0 && (
        <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+70px)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] z-40 px-3 md:px-4">
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-emerald-600 to-emerald-700 border-2 border-emerald-500 rounded-2xl shadow-2xl shadow-emerald-500/30 p-4 flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">{cartCount} Item{cartCount !== 1 ? 's' : ''}</p>
              <p className="text-base md:text-lg font-bold text-white truncate">{formatCurrency(quickTotal)}</p>
            </div>
            <button
              onClick={() => navigate('/rep/orders/new')}
              className="px-5 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 active:scale-95 transition whitespace-nowrap shadow-lg"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'green' | 'emerald';
}) {
  const cls =
    tone === 'green'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
      : tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
      : 'bg-white border-slate-200 text-slate-700';

  return (
    <div className={`rounded-xl border px-3.5 py-3 md:py-2.5 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wide font-bold opacity-75">{label}</p>
      <p className="text-base md:text-sm font-bold mt-1 md:mt-0.5 truncate">{value}</p>
    </div>
  );
}
