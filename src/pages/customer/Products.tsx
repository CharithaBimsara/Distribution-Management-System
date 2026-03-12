import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productsApi } from '../../services/api/productsApi';
import { addToCart, updateQuantity, removeFromCart, clearCart } from '../../store/slices/cartSlice';
import type { RootState } from '../../store/store';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Package, Store } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Product } from '../../types/product.types';
import { formatCurrency } from '../../utils/formatters';
import { calculateLine } from '../../utils/calculations';


export default function CustomerProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // quick order rows (desktop only)
  interface QuickRow { id: string; product?: Product; qty: number; }

  // initialize from localStorage so the table survives page reloads
  const savedQuick = typeof window !== 'undefined' ? localStorage.getItem('quickRows') : null;
  const initialQuick: QuickRow[] = savedQuick ? JSON.parse(savedQuick) : [{ id: crypto.randomUUID(), qty: 1 }];
  const [quickRows, setQuickRows] = useState<QuickRow[]>(initialQuick);
  const addQuickRow = () => setQuickRows(r => [...r, { id: crypto.randomUUID(), qty: 1 }]);
  const updateQuickRow = (id: string, changes: Partial<QuickRow>) => setQuickRows(r => r.map(row => row.id === id ? { ...row, ...changes } : row));
  const removeQuickRow = (id: string) => setQuickRows(r => r.filter(row => row.id !== id));

  // persist quick rows whenever they change
  useEffect(() => {
    localStorage.setItem('quickRows', JSON.stringify(quickRows));
  }, [quickRows]);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  const [brandFilter, setBrandFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState<number | ''>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Read URL params on mount
  useEffect(() => {
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const searchQuery = searchParams.get('search');
    
    if (category) setCategoryFilter(category);
    if (searchQuery) setSearch(searchQuery);
  }, [searchParams]);

  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);


  const getCartQty = useCallback((productId: string) => {
    return cartItems.find(i => i.productId === productId)?.quantity ?? 0;
  }, [cartItems]);

  const cartTotal = cartItems.reduce((s, i) => s + i.lineTotal, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  // quick order totals
  // count number of filled rows (distinct products) for quick order
  const quickCount = quickRows.filter(r => !!r.product).length;
  // calculate quick order total using dynamic formula rather than stored totals
  const quickTotal = quickRows.reduce((s, r) => {
    if (!r.product) return s;
    const calc = calculateLine({
      rate: r.product.sellingPrice || 0,
      qty: r.qty,
      discountPercent: r.product.discountPercent,
      taxAmount: r.product.taxAmount,
    });
    return s + calc.total;
  }, 0);

  // whenever quickRows go to zero we want the cart to stay in sync
  useEffect(() => {
    if (quickCount === 0) {
      dispatch(clearCart());
    }
  }, [quickCount, dispatch]);

  // if the page loads with some quickRows saved but an empty cart,
  // populate the cart automatically so the drawer shows the same items
  useEffect(() => {
    if (quickCount > 0 && cartCount === 0) {
      dispatch(clearCart());
      quickRows.forEach(r => {
        if (!r.product) return;
        const prod = r.product;
        const discPct = prod.discountPercent ?? 0;
        // derive tax rate from stored tax amount
        let taxRate = 0;
        if (prod.taxAmount != null) {
          const basePerUnit = prod.sellingPrice * (1 - discPct / 100);
          if (basePerUnit > 0) taxRate = prod.taxAmount / basePerUnit;
        }
        const calc = calculateLine({
          rate: prod.sellingPrice,
          qty: r.qty,
          discountPercent: discPct,
          taxAmount: prod.taxAmount,
        });
        dispatch(addToCart({
          lineId: r.id,
          productId: prod.id,
          productName: prod.name,
          unitPrice: prod.sellingPrice,
          quantity: r.qty,
          sku: prod.sku,
          discountPercent: discPct,
          taxRate,
          lineTotal: calc.total,
        }));
      });
    }
  }, [quickCount, cartCount, quickRows, dispatch]);

  const { data: categories } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => productsApi.customerCategories().then(r => r.data.data),
  });

  const exportProducts = async (format: 'excel' | 'pdf') => {
    const resp = await productsApi.customerCatalog({
      page: 1,
      pageSize: 10000,
      search: search || undefined,
      categoryId: categoryFilter || undefined,
      brand: brandFilter || undefined,
      minPrice: minPriceFilter || undefined,
      maxPrice: maxPriceFilter || undefined,
      sortBy,
      sortDir,
    });
    const items: Product[] = resp.data.data.items;
    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const dataForSheet = items.map(p => ({
        Description: p.name,
        Item: p.sku,
        Barcode: p.barcode || '',
        Category: p.categoryName || '',
        Brand: p.brand || '',
        Rate: p.sellingPrice,
        Qty: p.quantity,
        'Disc%': p.discountPercent ?? '',
        'Disc Amt': p.discountAmount ?? '',
        Tax: p.taxCode || '',
        'Tax Amt': p.taxAmount ?? '',
        Amount: p.totalAmount ?? ''
      }));
      const ws = XLSX.utils.json_to_sheet(dataForSheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, 'products-export.xlsx');
    } else {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      const cols = ['Description','Item','Barcode','Category','Brand','Rate','Qty','Disc%','Disc Amt','Tax','Tax Amt','Amount'];
      const rows = items.map(p => [
        p.name, p.sku, p.barcode||'', p.categoryName||'', p.brand||'', p.sellingPrice, p.quantity,
        p.discountPercent ?? '', p.discountAmount ?? '', p.taxCode||'', p.taxAmount ?? '', p.totalAmount ?? ''
      ]);
      // @ts-ignore
      doc.autoTable({ head: [cols], body: rows, startY: 20, styles: { fontSize: 8 } });
      doc.save('products-export.pdf');
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['customer-products', page, search, categoryFilter, brandFilter, minPriceFilter, maxPriceFilter, sortBy, sortDir],
    queryFn: () => productsApi.customerCatalog({
      page,
      pageSize: 30,
      search: search || undefined,
      categoryId: categoryFilter || undefined,
      brand: brandFilter || undefined,
      minPrice: minPriceFilter || undefined,
      maxPrice: maxPriceFilter || undefined,
      sortBy,
      sortDir,
    }).then(r => r.data.data),
  });

  // whenever quickRows change, if last row has product selected create a new blank
  useEffect(() => {
    if (quickRows.length && quickRows[quickRows.length - 1].product) {
      addQuickRow();
    }
  }, [quickRows]);

  const suggestedBrands = useMemo(() => {
    const items = data?.items || [];
    return Array.from(new Set(items.map((i: Product) => i.brand).filter(Boolean))).slice(0, 10) as string[];
  }, [data]);

  const handleIncrement = (product: Product) => {
    const qty = getCartQty(product.id);
    const discPct = product.discountPercent ?? 0;
    let taxRate = 0;
    if (product.taxAmount != null) {
      const basePerUnit = product.sellingPrice * (1 - discPct / 100);
      if (basePerUnit > 0) taxRate = product.taxAmount / basePerUnit;
    }
    if (qty === 0) {
      const calc = calculateLine({
        rate: product.sellingPrice,
        qty: 1,
        discountPercent: discPct,
        taxAmount: product.taxAmount,
      });
      dispatch(addToCart({
        lineId: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        unitPrice: product.sellingPrice,
        quantity: 1,
        sku: product.sku,
        discountPercent: discPct,
        taxRate,
        lineTotal: calc.total,
      }));
    } else {
      dispatch(updateQuantity({ productId: product.id, quantity: qty + 1 }));
    }
  }; 

  const handleDecrement = (product: Product) => {
    const qty = getCartQty(product.id);
    if (qty <= 1) {
      dispatch(removeFromCart({ productId: product.id }));
    } else {
      dispatch(updateQuantity({ productId: product.id, quantity: qty - 1 }));
    }
  };


  /* ── Quantity Stepper ── */
  const QuantityStepper = ({ product }: { product: Product }) => {
    const qty = getCartQty(product.id);
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(String(qty));

    useEffect(() => setEditValue(String(qty)), [qty]);

    const saveEdit = () => {
      let n = Math.max(1, Math.floor(Number(editValue) || 1));
      dispatch(updateQuantity({ productId: product.id, quantity: n }));
      setEditing(false);
    };

    if (qty === 0) {
      return (
        <button
          onClick={() => handleIncrement(product)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg shadow-sm active:scale-95 transition-all bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add</span>
        </button>
      );
    }

    return (
      <div className="flex items-center gap-0.5 bg-slate-50 rounded-lg p-0.5 border border-slate-200">
        <button
          onClick={() => handleDecrement(product)}
          className="w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm transition active:scale-90"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {editing ? (
          <input
            autoFocus
            inputMode="numeric"
            type="number"
            min={1}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditing(false); setEditValue(String(qty)); } }}
            className="w-14 text-sm font-bold text-center border border-slate-200 rounded-md px-1"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="text-sm font-bold w-8 text-center text-slate-900 tabular-nums">{qty}</button>
        )}

        <button
          onClick={() => handleIncrement(product)}
          className="w-8 h-8 rounded-md flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition active:scale-90"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  /* ── Product Row ── */
  const ProductRow = ({ product }: { product: Product }) => {
    const qty = getCartQty(product.id);
    const longName = (product.name || '').length > 12;

    return (
      <div
        className={`group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 bg-white border-b border-slate-100 last:border-b-0 hover:bg-orange-50/40 transition-colors ${qty > 0 ? 'bg-orange-50/30' : ''}`}
      >
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm sm:text-base font-semibold text-slate-900 leading-tight ${longName ? 'line-clamp-2 sm:truncate' : 'truncate'}`}>
            {product.name}
          </h3>
          {product.brand && (
            <p className="text-[11px] text-slate-400 mt-1 truncate">{product.brand}</p>
          )}
          <p className="text-sm sm:text-base font-bold text-orange-600 tabular-nums">
            {formatCurrency(product.sellingPrice)}
          </p>
          {typeof product.quantity === 'number' && (
            <p className="text-[11px] text-slate-500 mt-1">Qty: {product.quantity}</p>
          )}
        </div>

        <div className="flex-shrink-0">
          <QuantityStepper product={product} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero Header with Gradient ── */}
      <div className="relative bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 text-white px-4 pt-6 pb-20 lg:pb-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-400/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative z-10 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-5 h-5 text-orange-200" />
            <span className="text-sm text-orange-100 font-medium">Shop Catalog</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-1">Quick Order</h1>
          <p className="text-orange-100 text-sm">{data?.totalCount ?? 0} products available</p>
        </div>
      </div>

      {/* ── Sticky Search & Filters Bar (constrained to main content width on desktop) ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200/80 shadow-sm -mt-12 lg:-mt-6 mx-4 lg:mx-auto lg:max-w-screen-xl rounded-t-2xl">

        {/* Cart Summary Row (desktop only) */}
        <div className="hidden lg:block px-4 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <p className="text-xs text-slate-500">Browse and add items to cart</p>
            {quickCount > 0 && (
              <button
                onClick={() => {
                  // keep the quick table intact but navigate straight to checkout
                  if (quickCount > 0) {
                    dispatch(clearCart());
                    quickRows.forEach(r => {
                      if (!r.product) return;
                      const prod = r.product;
                      const discPct = prod.discountPercent ?? 0;
                      let taxRate = 0;
                      if (prod.taxAmount != null) {
                        const basePerUnit = prod.sellingPrice * (1 - discPct / 100);
                        if (basePerUnit > 0) taxRate = prod.taxAmount / basePerUnit;
                      }
                      const calc = calculateLine({
                        rate: prod.sellingPrice,
                        qty: r.qty,
                        discountPercent: discPct,
                        taxAmount: prod.taxAmount,
                      });
                      dispatch(addToCart({
                        productId: prod.id,
                        productName: prod.name,
                        unitPrice: prod.sellingPrice,
                        quantity: r.qty,
                        sku: prod.sku,
                        discountPercent: discPct,
                        taxRate,
                        lineTotal: calc.total,
                      }));
                    });
                  }
                  navigate('/shop/checkout');
                }}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm shadow-orange-500/20 active:scale-95 transition-all"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="tabular-nums">{quickCount}</span>
                <span className="hidden sm:inline text-orange-100">|</span>
                <span className="hidden sm:inline font-bold text-sm">{formatCurrency(quickTotal)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search + filter row */}
        <div className="px-4 lg:px-6 py-3">
          <div className="flex items-center gap-2 max-w-screen-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20 outline-none transition"
              />
            </div>

            {/* Mobile filter trigger */}
              {categoryFilter && categories && (
                <span className="flex items-center gap-1 text-[11px] bg-orange-50 border border-orange-200 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                  {categories.find((c: any) => c.id === categoryFilter)?.name}
                  <button onClick={() => setCategoryFilter(null)} className="ml-0.5 text-orange-500"><X className="w-3 h-3" /></button>
                </span>
              )}
              {brandFilter && (
                <span className="flex items-center gap-1 text-[11px] bg-orange-50 border border-orange-200 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                  {brandFilter}
                  <button onClick={() => setBrandFilter('')} className="ml-0.5 text-orange-500"><X className="w-3 h-3" /></button>
                </span>
              )}
              {(minPriceFilter || maxPriceFilter) && (
                <span className="flex items-center gap-1 text-[11px] bg-orange-50 border border-orange-200 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                  LKR {minPriceFilter || '0'} – {maxPriceFilter || '∞'}
                  <button onClick={() => { setMinPriceFilter(''); setMaxPriceFilter(''); }} className="ml-0.5 text-orange-500"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>

          {/* Quick order table (all screen sizes) */}
            <div className="bg-white p-4 mt-2 mb-4 rounded-xl shadow-lg overflow-x-auto mx-4 lg:mx-auto lg:max-w-screen-2xl">
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
                    // always use sellingPrice per unit
                    const unitAmt = prod ? (prod.sellingPrice || 0) : 0;
                    let amt = 0;
                    if (prod) {
                      const calc = calculateLine({
                        rate: unitAmt,
                        qty: row.qty,
                        discountPercent: prod.discountPercent,
                        taxAmount: prod.taxAmount,
                      });
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
                              // if last row was selected, add another
                              if (quickRows[quickRows.length - 1].id === row.id) addQuickRow();
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
                            onChange={e => updateQuickRow(row.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
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

          {/* Skeleton loading */}
          {isLoading ? (
            <div className="mt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 animate-pulse">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded-full w-3/5" />
                    <div className="h-2 bg-slate-100 rounded-full w-2/5" />
                  </div>
                  <div className="h-4 bg-slate-200 rounded-full w-16" />
                  <div className="h-8 bg-slate-100 rounded-lg w-24" />
                </div>
              ))}
            </div>

          ) : !data?.items?.length ? (
            <div className="text-center py-20 mx-3 mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-bold text-slate-700 text-base">No products found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
            </div>

          ) : (
            <>
              {/* ── Product List (Rows) ── */}
              {/* table already handles product rendering, so mobile row list removed */}

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 pt-5">
                  <span className="text-xs text-slate-400 font-medium tabular-nums">
                    Page {page} of {data.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-600 rounded-xl disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= data.totalPages}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-xl disabled:opacity-40 hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Fixed Bottom Cart Bar (Mobile) ── */}
      {cartCount > 0 && (
        <div className="fixed bottom-14 left-0 right-0 z-30 lg:hidden px-3 pb-2">
          <button
            onClick={() => navigate('/shop/checkout')}
            className="w-full flex items-center justify-between bg-slate-900 text-white px-4 py-3.5 rounded-2xl shadow-2xl shadow-slate-900/40 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <span className="text-sm font-semibold">View Cart</span>
            </div>
            <span className="text-sm font-bold tabular-nums">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* ── Cart Drawer ── */}

    </div>
  );
}