import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api/productsApi';
import { customersApi } from '../../services/api/customersApi';
import { orderDraftUtils, type OrderDraftItem } from '../../utils/orderDraft';
import { formatCurrency } from '../../utils/formatters';
import { calculateLine } from '../../utils/calculations';
import { ArrowLeft, Search, ShoppingCart, Plus, Minus, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Product } from '../../types/product.types';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import ProductDropdown from '../../components/common/ProductDropdown';

export default function RepSelectProducts() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState(orderDraftUtils.get());
  const isDesktop = useIsDesktop();

  interface QuickRow { id: string; product?: Product; qty: number; }
  const [quickRows, setQuickRows] = useState<QuickRow[]>([]);
  const [rowSearches, setRowSearches] = useState<Record<string, string>>({});
  const addQuickRow = () => setQuickRows(r => [...r, { id: crypto.randomUUID(), qty: 1 }]);
  const updateQuickRow = (id: string, changes: Partial<QuickRow>) => {
    setQuickRows(r => r.map(row => row.id === id ? { ...row, ...changes } : row));
  };
  const removeQuickRow = (id: string) => {
    const row = quickRows.find(r => r.id === id);
    if (row && row.product) {
      orderDraftUtils.removeItem(row.product.id);
      setDraft(orderDraftUtils.get());
    }
    setQuickRows(r => r.filter(row => row.id !== id));
  };

  useEffect(() => {
    if (quickRows.length && quickRows[quickRows.length - 1].product) {
      addQuickRow();
    }
  }, [quickRows]);

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

  const { data, isLoading } = useQuery({
    queryKey: ['rep-products-catalog', searchTerm, currentPage],
    queryFn: () => productsApi.customerCatalog({
      page: currentPage,
      pageSize: 24,
      search: searchTerm || undefined,
    }).then(r => r.data.data),
  });

  const { data: allCatalogProducts = [] } = useQuery({
    queryKey: ['rep-products-catalog-all'],
    queryFn: () => productsApi.customerCatalogAll(),
  });

  const selectedCustomerId = draft.customerId;
  const { data: selectedCustomerData } = useQuery({
    queryKey: ['rep-selected-customer', selectedCustomerId],
    queryFn: () => customersApi.repGetById(selectedCustomerId!).then(r => r.data.data),
    enabled: !!selectedCustomerId,
  });
  const isNonTaxCustomer = ((selectedCustomerData?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax');

  const getBaseRate = (p: Product) => (p.sellingPrice || 0) + (p.discountAmount || 0);
  const getCalcInput = (p: Product) => {
    const isSpecialPrice = p.discountPercent == null && (p.discountAmount || 0) > 0;
    const rate = isSpecialPrice ? (p.sellingPrice || 0) : getBaseRate(p);
    const discountPercent = isSpecialPrice ? 0 : (p.discountPercent ?? 0);
    const taxAmount = p.taxAmount ?? 0;
    return { rate, discountPercent, taxAmount, isSpecialPrice };
  };

  useEffect(() => {
    if (!allCatalogProducts.length) return;
    setQuickRows(rows => rows.map(r => {
      if (!r.product || r.product.discountPercent != null) return r;
      const p = allCatalogProducts.find((p: Product) => p.id === r.product?.id);
      if (!p) return r;
      return { ...r, product: p };
    }));
  }, [allCatalogProducts]);

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
      allIncPrice: product.totalAmount || undefined,
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
        mrp: prod.mrp,
        discountPercent: prod.discountPercent,
        taxCode: prod.taxCode,
        taxAmount: prod.taxAmount,
        allIncPrice: prod.totalAmount || undefined,
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

  const cartCount = orderDraftUtils.getItemCount();
  const quickTotalGross = quickRows.reduce((sum, r) => {
    if (!r.product) return sum;
    const pricing = getCalcInput(r.product);
    const baseAmount = pricing.rate * r.qty;
    const rowTax = (r.product.taxAmount || 0) * r.qty;
    return sum + (isNonTaxCustomer ? (baseAmount + rowTax) : baseAmount);
  }, 0);
  const quickTotalTax = quickRows.reduce((sum, r) => {
    if (!r.product) return sum;
    const tax = isNonTaxCustomer ? 0 : (r.product.taxAmount || 0);
    return sum + tax * r.qty;
  }, 0);
  const quickTotalDiscount = quickRows.reduce((sum, r) => {
    if (!r.product) return sum;
    const pricing = getCalcInput(r.product);
    const unitDisc = pricing.isSpecialPrice ? 0 : (r.product.discountAmount || 0);
    return sum + unitDisc * r.qty;
  }, 0);
  const quickTotal = isNonTaxCustomer
    ? quickTotalGross - quickTotalDiscount
    : quickTotalGross + quickTotalTax - quickTotalDiscount;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 md:pb-28 lg:pb-6">
      <div className="px-4 md:px-5 lg:px-6 pt-4 md:pt-6 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Add Products</h1>
              <p className="text-xs text-slate-500">Browse the catalog and add items to your order</p>
            </div>
          </div>
          <button onClick={() => navigate(-1)}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition text-sm active:scale-[0.98]">
            Continue &rarr;
          </button>
        </div>

        {/* Stats Row (mobile) */}
        {!isDesktop && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items</p>
              <p className="text-lg font-bold text-slate-900">{cartCount}</p>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catalog</p>
              <p className="text-lg font-bold text-slate-900">{data?.items?.length || 0}</p>
            </div>
            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(quickTotal)}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pb-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search by product name, SKU, or brand..."
                className="w-full pl-11 pr-4 py-3.5 text-sm border-0 outline-none placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-4">Loading products...</p>
          </div>
        )}

        {/* Products */}
        {!isLoading && data && (
          <>
            {data.items.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-lg font-semibold text-slate-700">No products found</p>
                <p className="text-sm text-slate-500 mt-2">Try adjusting your search</p>
              </div>
            ) : (
              <>
                {/* Desktop: Table */}
                {isDesktop ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                          <Package className="w-4 h-4 text-violet-600" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900">Product Selection</h2>
                      </div>
                      {cartCount > 0 && (
                        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
                          <ShoppingCart className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-700">{cartCount} items</span>
                          <span className="text-emerald-300">|</span>
                          <span className="text-sm font-bold text-emerald-700">{formatCurrency(quickTotal)}</span>
                        </div>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500">
                            <th className="text-center px-3 py-3 font-semibold text-[10px] uppercase tracking-wider w-8">#</th>
                            <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Item Code</th>
                            <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider min-w-[280px]">Item Description</th>
                            <th className="text-center px-3 py-3 font-semibold text-[10px] uppercase tracking-wider w-20">Qty</th>
                            <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Rate</th>
                            <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Disc %</th>
                            <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Disc Amt</th>
                            {!isNonTaxCustomer && <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Tax</th>}
                            <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Line Gross</th>
                            <th className="w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {quickRows.map(row => {
                            const prod = row.product;
                            let rate = 0, discPct = 0, discAmt = 0, taxAmt = 0, grossAmount = 0;
                            if (prod) {
                              const pricing = getCalcInput(prod);
                              rate = pricing.rate;
                              discPct = pricing.discountPercent;
                              discAmt = pricing.isSpecialPrice ? 0 : (prod.discountAmount || 0);
                              taxAmt = prod.taxAmount || 0;
                              const baseAmount = rate * row.qty;
                              const rowTax = taxAmt * row.qty;
                              grossAmount = isNonTaxCustomer ? (baseAmount + rowTax) : baseAmount;
                            }
                            return (
                              <tr key={row.id} className="group hover:bg-slate-50/50 transition-colors">
                                {/* # */}
                                <td className="px-3 py-2 text-center text-[10px] text-slate-400">{quickRows.indexOf(row) + 1}</td>
                                {/* Item Code (SKU) */}
                                <td className="px-3 py-2 text-slate-500 font-mono text-[10px] whitespace-nowrap">{prod?.sku || ''}</td>
                                {/* Item Description (dropdown) */}
                                <td className="px-3 py-2 min-w-[280px]">
                                  <ProductDropdown
                                    rowId={row.id}
                                    value={rowSearches[row.id] !== undefined ? rowSearches[row.id] : (prod?.name || '')}
                                    products={allCatalogProducts as Product[]}
                                    selectedProductIds={new Set(quickRows.filter(r => r.id !== row.id && r.product).map(r => r.product!.id))}
                                    currentProductId={prod?.id}
                                    onChange={(val) => {
                                      setRowSearches(prev => ({ ...prev, [row.id]: val }));
                                      if (!val.trim()) updateQuickRow(row.id, { product: undefined });
                                    }}
                                    onSelect={(p) => {
                                      updateQuickRow(row.id, { product: p, qty: 1 });
                                      setRowSearches(prev => ({ ...prev, [row.id]: p.name }));
                                      if (quickRows[quickRows.length - 1].id === row.id) addQuickRow();
                                      syncRowItem({ ...row, product: p, qty: 1 });
                                    }}
                                  />
                                </td>
                                {/* Qty */}
                                <td className="px-2 py-2 text-center">
                                  <input
                                    type="text" inputMode="numeric" pattern="[0-9]*" value={row.qty || ''} disabled={!prod}
                                    placeholder="Qty"
                                    onChange={e => { const q = Math.max(1, parseInt(e.target.value) || 1); updateQuickRow(row.id, { qty: q }); if (prod) { syncRowItem({ ...row, qty: q }); } }}
                                    className="w-16 text-center text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition disabled:opacity-40"
                                  />
                                </td>
                                {/* Rate */}
                                <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">{prod ? formatCurrency(isNonTaxCustomer ? rate + taxAmt : rate) : ''}</td>
                                {/* Disc % */}
                                <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{prod && discPct > 0 ? `${discPct}%` : ''}</td>
                                {/* Disc Amt */}
                                <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{prod && discAmt > 0 ? formatCurrency(discAmt) : ''}</td>
                                {/* Tax amount — tax customers only */}
                                {!isNonTaxCustomer && <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{prod && taxAmt > 0 ? formatCurrency(taxAmt) : ''}</td>}
                                {/* Line Gross */}
                                <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">{prod ? formatCurrency(grossAmount) : ''}</td>
                                <td className="px-2 py-2 text-center">
                                  <button onClick={() => removeQuickRow(row.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                                    <span className="text-sm">&times;</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Mobile: Product Cards */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {data.items.map((product: Product) => {
                      const qty = getCartQty(product.id);
                      const displayPrice = (product.sellingPrice || 0) + (isNonTaxCustomer ? (product.taxAmount || 0) : 0);
                      return (
                        <div key={product.id} className={`bg-white rounded-2xl border overflow-hidden transition-all active:scale-[0.98] ${qty > 0 ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'}`}>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{product.name}</h3>
                                <p className="text-[11px] text-slate-400 font-mono mt-1">{product.sku}</p>
                              </div>
                              {product.brand && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md shrink-0">{product.brand}</span>
                              )}
                            </div>
                            <p className="text-xl font-bold text-emerald-600 mb-4">{formatCurrency(displayPrice)}</p>

                            {qty === 0 ? (
                              <button onClick={() => handleAddToCart(product)}
                                className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2 active:scale-[0.97]">
                                <Plus className="w-4 h-4" /> Add to Cart
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleDecrement(product.id)}
                                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center active:scale-95">
                                  <Minus className="w-5 h-5 text-slate-700" />
                                </button>
                                <div className="px-4 py-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl font-bold text-emerald-700 min-w-[3.5rem] text-center text-lg">
                                  {qty}
                                </div>
                                <button onClick={() => handleIncrement(product)}
                                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center justify-center active:scale-95">
                                  <Plus className="w-5 h-5 text-white" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6 mb-4">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-50 transition">
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <div className="hidden md:flex items-center gap-1">
                      {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button key={page} onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-xl text-sm font-semibold transition ${currentPage === page ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}>
                            {page}
                          </button>
                        );
                      })}
                      {data.totalPages > 5 && <span className="px-2 text-slate-400">...</span>}
                    </div>
                    <div className="md:hidden text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
                      {currentPage} / {data.totalPages}
                    </div>
                    <button onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))} disabled={currentPage === data.totalPages}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-50 transition">
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      {!isDesktop && cartCount > 0 && (
        <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+70px)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] z-40 px-3">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => navigate('/rep/orders/new')}
              className="w-full bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/30 p-4 flex items-center gap-3 active:scale-[0.98] transition">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-semibold text-emerald-100 uppercase tracking-wider">{cartCount} Item{cartCount !== 1 ? 's' : ''}</p>
                <p className="text-base font-bold">{formatCurrency(quickTotal)}</p>
              </div>
              <span className="px-5 py-2.5 bg-white text-emerald-700 rounded-xl text-sm font-bold shrink-0">Continue</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
