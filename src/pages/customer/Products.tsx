import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productsApi } from '../../services/api/productsApi';
import { customersApi } from '../../services/api/customersApi';
import { addToCart, updateQuantity, removeFromCart, clearCart } from '../../store/slices/cartSlice';
import type { RootState } from '../../store/store';
import { ChevronDown, Package, Store, Trash2, ShoppingCart } from 'lucide-react';
import type { Product } from '../../types/product.types';
import { formatCurrency } from '../../utils/formatters';
import { calculateLine } from '../../utils/calculations';

/* ─────────────────────────────────────────────
   Modern Product Dropdown Component (Orange Theme)
───────────────────────────────────────────── */
interface ProductDropdownProps {
  rowId: string;
  value: string;
  products: Product[];
  selectedProductIds: Set<string>;
  currentProductId?: string;
  onSelect: (product: Product) => void;
  onChange: (value: string) => void;
}

function ProductDropdown({
  rowId,
  value,
  products,
  selectedProductIds,
  currentProductId,
  onSelect,
  onChange,
}: ProductDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const [floatingStyle, setFloatingStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(60);

  useEffect(() => {
    setVisibleCount(60);
  }, [value, products.length, currentProductId]);

  // Auto-resize textarea based on content length
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const base = products.filter(
      (p) => !selectedProductIds.has(p.id) || p.id === currentProductId
    );
    if (!q) return base;
    return base
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
      .sort((a, b) => {
        const aS = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bS = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return aS - bS || a.name.localeCompare(b.name);
      });
  }, [products, value, selectedProductIds, currentProductId]);

  const visibleItems = filtered.slice(0, visibleCount);

  const updatePosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const buffer = 12;
    const dropdownMaxHeight = 320;
    const availableBelow = window.innerHeight - rect.bottom - buffer;
    const availableAbove = rect.top - buffer;

    const shouldDropUp = availableBelow < 220 && availableAbove > availableBelow;
    setDropUp(shouldDropUp);

    const top = shouldDropUp ? rect.top - (dropdownMaxHeight <= availableAbove ? dropdownMaxHeight : availableAbove) : rect.bottom + 8;
    const maxHeight = shouldDropUp ? Math.min(dropdownMaxHeight, availableAbove) : Math.min(dropdownMaxHeight, availableBelow);

    setFloatingStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      top: shouldDropUp ? undefined : top,
      bottom: shouldDropUp ? window.innerHeight - rect.top + 8 : undefined,
      maxHeight,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) { onSelect(filtered[highlighted]); setOpen(false); }
    } else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className={`relative flex items-center bg-transparent rounded-xl transition-all ${open ? 'ring-2 ring-orange-500/20 bg-white' : 'hover:bg-slate-50'}`}>
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          placeholder="Search product..."
          onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(0); }}
          onFocus={() => { setOpen(true); setHighlighted(0); }}
          onKeyDown={handleKeyDown}
          className="w-full pl-3 pr-8 py-2.5 text-sm font-bold text-slate-800 bg-transparent border-transparent focus:outline-none focus:ring-0 focus:border-transparent resize-none overflow-hidden placeholder-slate-400 break-words"
          style={{ minHeight: '40px' }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180 text-orange-500' : ''}`} />
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="w-full max-w-full rounded-2xl overflow-hidden overflow-x-hidden bg-white border border-slate-200 animate-fade-in"
          style={{
            ...floatingStyle,
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
          }}
        >
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Select Product</span>
            <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200">{filtered.length} found</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Package className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-700 font-bold">No products found</p>
              <p className="text-xs text-slate-500 mt-1">Try a different keyword</p>
            </div>
          ) : (
            <ul
              ref={listRef}
              className="max-h-60 overflow-y-auto overflow-x-hidden overscroll-contain"
              style={{ scrollbarWidth: 'thin' }}
              onScroll={(e) => {
                const t = e.target as HTMLElement;
                if (t.scrollHeight - t.scrollTop - t.clientHeight < 36 && visibleCount < filtered.length) {
                  setVisibleCount(prev => Math.min(prev + 50, filtered.length));
                }
              }}
            >
              {visibleItems.map((p, i) => (
                <li
                  key={p.id}
                  onMouseDown={e => { e.preventDefault(); onSelect(p); setOpen(false); }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`px-4 py-3 cursor-pointer border-b border-slate-50 last:border-b-0 transition-all duration-100 ${
                    i === highlighted
                      ? 'bg-orange-50/50 border-l-[3px] border-l-orange-500'
                      : 'border-l-[3px] border-l-transparent hover:bg-slate-50'
                  }`}
                >
                  <p className={`text-sm font-bold leading-snug break-words ${i === highlighted ? 'text-orange-900' : 'text-slate-800'}`} style={{ whiteSpace: 'normal' }}>
                    {p.name}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><span>↑↓</span> Navigate</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><span>↵</span> Select</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><span>ESC</span> Close</span>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function CustomerProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');

  interface QuickRow { id: string; product?: Product; qty: number; }

  const savedQuick = typeof window !== 'undefined' ? localStorage.getItem('quickRows') : null;
  const initialQuick: QuickRow[] = savedQuick ? JSON.parse(savedQuick) : [{ id: crypto.randomUUID(), qty: 1 }];
  const [quickRows, setQuickRows] = useState<QuickRow[]>(initialQuick);
  const [rowSearches, setRowSearches] = useState<Record<string, string>>({});

  const addQuickRow = () => setQuickRows(r => [...r, { id: crypto.randomUUID(), qty: 1 }]);
  const setRowSearch = (id: string, value: string) => setRowSearches(cur => ({ ...cur, [id]: value }));

  const updateQuickRow = (id: string, changes: Partial<QuickRow>) =>
    setQuickRows(r => {
      if (changes.product) {
        const dup = r.some(row => row.id !== id && row.product?.id === changes.product?.id);
        if (dup) { toast.error('This product is already selected in another row'); return r; }
      }
      const next = r.map(row => row.id === id ? { ...row, ...changes } : row);
      if (changes.product) setRowSearch(id, changes.product.name);
      return next;
    });

  const removeQuickRow = (id: string) =>
    setQuickRows(r => {
      const next = r.filter(row => row.id !== id);
      return next.length ? next : [{ id: crypto.randomUUID(), qty: 1 }];
    });

  useEffect(() => { localStorage.setItem('quickRows', JSON.stringify(quickRows)); }, [quickRows]);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState<number | ''>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [productPickerSearch, setProductPickerSearch] = useState('');

  useEffect(() => {
    const category = searchParams.get('category');
    const searchQuery = searchParams.get('search');
    if (category) setCategoryFilter(category);
    if (searchQuery) setSearch(searchQuery);
  }, [searchParams]);

  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const getCartQty = useCallback(
    (productId: string) => cartItems.find(i => i.productId === productId)?.quantity ?? 0,
    [cartItems]
  );

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const getBaseRate = (p: Product) => (p.sellingPrice || 0) + (p.discountAmount || 0);

  const getCalcInput = (p: Product) => {
    const isSpecialPrice = p.discountPercent == null && (p.discountAmount || 0) > 0;
    const rate = isSpecialPrice ? (p.sellingPrice || 0) : getBaseRate(p);
    const discountPercent = isSpecialPrice ? 0 : (p.discountPercent ?? 0);
    const taxAmount = p.taxAmount ?? 0;
    return { rate, discountPercent, taxAmount, isSpecialPrice };
  };

  const quickCount = quickRows.filter(r => !!r.product).length;

  useEffect(() => { if (quickCount === 0) dispatch(clearCart()); }, [quickCount, dispatch]);

  useEffect(() => {
    if (quickCount > 0 && cartCount === 0) {
      dispatch(clearCart());
      quickRows.forEach(r => {
        if (!r.product) return;
        const prod = r.product;
        const pricing = getCalcInput(prod);
        let taxRate = 0;
        if (pricing.taxAmount != null) {
          const base = pricing.rate * (1 - pricing.discountPercent / 100);
          if (base > 0) taxRate = pricing.taxAmount / base;
        }
        const calc = calculateLine({ rate: pricing.rate, qty: r.qty, discountPercent: pricing.discountPercent, taxAmount: pricing.taxAmount });
        dispatch(addToCart({ lineId: r.id, productId: prod.id, productName: prod.name, unitPrice: pricing.rate, quantity: r.qty, sku: prod.sku, discountPercent: pricing.discountPercent, taxRate, lineTotal: calc.total }));
      });
    }
  }, [quickCount, cartCount, quickRows, dispatch]);

  const { data: customerProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['customer-profile-for-order-table-tax-mode'],
    queryFn: () => customersApi.customerGetProfile().then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const isNonTaxCustomer =
    (customerProfile?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax';

  const totalGrossAmount = quickRows.reduce((total, r) => {
    if (!r.product) return total;
    const pricing = getCalcInput(r.product);
    const rowBase = pricing.rate * r.qty;
    const rowTax = (r.product.taxAmount || 0) * r.qty;
    return total + (isNonTaxCustomer ? (rowBase + rowTax) : rowBase);
  }, 0);

  const totalTaxAmount = quickRows.reduce((total, r) => {
    if (!r.product) return total;
    const tax = isNonTaxCustomer ? 0 : (r.product.taxAmount || 0);
    return total + tax * r.qty;
  }, 0);

  const totalDiscountAmount = quickRows.reduce((total, r) => {
    if (!r.product) return total;
    const prod = r.product;
    const pricing = getCalcInput(prod);
    const unitDisc = pricing.isSpecialPrice ? 0 : (prod.discountAmount || 0);
    return total + unitDisc * r.qty;
  }, 0);

  const finalAmount = isNonTaxCustomer
    ? totalGrossAmount - totalDiscountAmount
    : totalGrossAmount + totalTaxAmount - totalDiscountAmount;

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['customer-products-all-for-order', search, categoryFilter, brandFilter, minPriceFilter, maxPriceFilter, sortBy, sortDir],
    queryFn: () =>
      productsApi.customerCatalogAll({
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        brand: brandFilter || undefined,
        minPrice: minPriceFilter || undefined,
        maxPrice: maxPriceFilter || undefined,
        sortBy, sortDir,
      }),
  });

  useEffect(() => {
    if (quickRows.length && quickRows[quickRows.length - 1].product) addQuickRow();
  }, [quickRows]);

  const filteredProducts = useMemo(() => {
    const searchTerm = productPickerSearch.trim().toLowerCase();
    const base = Array.isArray(allProducts) ? allProducts : [];
    if (!searchTerm) return [...base].sort((a, b) => a.name.localeCompare(b.name));
    return base
      .filter(p => p.name.toLowerCase().includes(searchTerm) || (p.sku || '').toLowerCase().includes(searchTerm))
      .sort((a, b) => {
        const aS = a.name.toLowerCase().startsWith(searchTerm) ? 0 : 1;
        const bS = b.name.toLowerCase().startsWith(searchTerm) ? 0 : 1;
        return aS - bS || a.name.localeCompare(b.name);
      });
  }, [allProducts, productPickerSearch]);

  const handleIncrement = (product: Product) => {
    const qty = getCartQty(product.id);
    const pricing = getCalcInput(product);
    let taxRate = 0;
    if (pricing.taxAmount != null) {
      const base = pricing.rate * (1 - pricing.discountPercent / 100);
      if (base > 0) taxRate = pricing.taxAmount / base;
    }
    if (qty === 0) {
      const calc = calculateLine({ rate: pricing.rate, qty: 1, discountPercent: pricing.discountPercent, taxAmount: pricing.taxAmount });
      dispatch(addToCart({ lineId: crypto.randomUUID(), productId: product.id, productName: product.name, unitPrice: pricing.rate, quantity: 1, sku: product.sku, discountPercent: pricing.discountPercent, taxRate, lineTotal: calc.total }));
    } else {
      dispatch(updateQuantity({ productId: product.id, quantity: qty + 1 }));
    }
  };

  const handleDecrement = (product: Product) => {
    const qty = getCartQty(product.id);
    if (qty <= 1) dispatch(removeFromCart({ productId: product.id }));
    else dispatch(updateQuantity({ productId: product.id, quantity: qty - 1 }));
  };

  const goToCreateOrder = () => {
    dispatch(clearCart());
    quickRows.forEach(r => {
      if (!r.product) return;
      const prod = r.product;
      const pricing = getCalcInput(prod);
      let taxRate = 0;
      if (pricing.taxAmount != null) {
        const base = pricing.rate * (1 - pricing.discountPercent / 100);
        if (base > 0) taxRate = pricing.taxAmount / base;
      }
      const calc = calculateLine({ rate: pricing.rate, qty: r.qty, discountPercent: pricing.discountPercent, taxAmount: pricing.taxAmount });
      dispatch(addToCart({ productId: prod.id, productName: prod.name, unitPrice: pricing.rate, quantity: r.qty, sku: prod.sku, discountPercent: pricing.discountPercent, taxRate, lineTotal: calc.total }));
    });
    navigate('/shop/checkout');
  };

  if (isProfileLoading || !customerProfile) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 font-medium">
        Loading customer profile...
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5 lg:space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 px-4 lg:px-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Order</h1>
          <p className="text-sm text-slate-500 mt-1">Select products using the table below to add to your cart.</p>
        </div>
      </div>

      <div className="px-4 lg:px-0">
        <div className="max-w-screen-xl mx-auto overflow-visible space-y-5">

          {/* Separate Header Box */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 border border-slate-200 bg-white rounded-3xl shadow-sm gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                <Store className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Quick Order Entry
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Search and select items row by row</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={goToCreateOrder}
                disabled={quickCount === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-600/20 hover:bg-orange-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                Proceed to Checkout
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-1/4 min-w-[220px]">Description</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Item / SKU</th>
                    <th className="px-3 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Qty</th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Rate</th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">MRP</th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Disc %</th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Disc Amt</th>
                    {!isNonTaxCustomer && <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest hidden xl:table-cell">Tax</th>}
                    {!isNonTaxCustomer && <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest hidden xl:table-cell">Tax Amt</th>}
                    <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Gross Amount</th>
                    <th className="px-3 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest w-[60px]">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {quickRows.map((row, rowIndex) => {
                    const prod = row.product;
                    const selectedProductIds = new Set(
                      quickRows.filter(r => r.id !== row.id && r.product).map(r => r.product!.id)
                    );

                    let rate = 0, discPct = 0, discAmt = 0, taxAmt = 0, grossAmount = 0;
                    if (prod) {
                      const pricing = getCalcInput(prod);
                      rate = pricing.rate;
                      discPct = pricing.discountPercent;
                      discAmt = pricing.isSpecialPrice ? 0 : (prod.discountAmount || 0);
                      taxAmt = prod.taxAmount || 0;

                      const baseAmount = rate * row.qty;
                      const rowTaxAmount = taxAmt * row.qty;
                      grossAmount = isNonTaxCustomer ? (baseAmount + rowTaxAmount) : baseAmount;
                    }

                    return (
                      <tr
                        key={row.id}
                        className={`group transition-colors ${
                          prod ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 hover:bg-slate-50'
                        }`}
                      >
                        {/* Description */}
                        <td className="px-3 py-2 w-1/4 min-w-[220px]">
                          <ProductDropdown
                            rowId={row.id}
                            value={rowSearches[row.id] !== undefined ? rowSearches[row.id] : (prod?.name || '')}
                            products={filteredProducts}
                            selectedProductIds={selectedProductIds}
                            currentProductId={prod?.id}
                            onChange={val => {
                              setRowSearch(row.id, val);
                              if (!val.trim()) updateQuickRow(row.id, { product: undefined });
                            }}
                            onSelect={selectedProduct => {
                              updateQuickRow(row.id, { product: selectedProduct, qty: 1 });
                              if (quickRows[quickRows.length - 1].id === row.id) addQuickRow();
                            }}
                          />
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-4">
                          {prod?.sku
                            ? <span className="font-medium text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{prod.sku}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>

                        {/* Qty */}
                        <td className="px-3 py-4 text-center">
                          <input
                            type="number" min={1} value={row.qty} disabled={!prod}
                            onChange={e => updateQuickRow(row.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-14 text-center font-bold text-sm text-slate-900 bg-white border border-slate-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 disabled:opacity-40 disabled:bg-slate-50 transition-all no-number-spin"
                          />
                        </td>

                        {/* Rate */}
                        <td className="px-4 py-4 text-right text-sm font-medium text-slate-500">
                          {prod ? formatCurrency(rate) : <span className="text-slate-300">—</span>}
                        </td>

                        {/* MRP (Hidden on smaller screens to save space) */}
                        <td className="px-4 py-4 text-right text-sm font-medium text-slate-500 hidden lg:table-cell">
                          {prod?.mrp != null ? formatCurrency(prod.mrp) : <span className="text-slate-300">—</span>}
                        </td>

                        {/* Disc % */}
                        <td className="px-4 py-4 text-right text-sm font-bold text-emerald-600">
                          {prod && discPct > 0 ? `${discPct}%` : <span className="text-slate-300">—</span>}
                        </td>

                        {/* Disc Amt */}
                        <td className="px-4 py-4 text-right text-sm font-bold text-emerald-600">
                          {prod && discAmt > 0 ? formatCurrency(discAmt) : <span className="text-slate-300">—</span>}
                        </td>

                        {/* Tax Code (Hidden on smaller screens to save space) */}
                        {!isNonTaxCustomer && (
                          <td className="px-4 py-4 text-right text-sm font-medium text-slate-500 hidden xl:table-cell">
                            {prod?.taxCode ? prod.taxCode : <span className="text-slate-300">—</span>}
                          </td>
                        )}

                        {/* Tax Amt (Hidden on smaller screens to save space) */}
                        {!isNonTaxCustomer && (
                          <td className="px-4 py-4 text-right text-sm font-medium text-slate-500 hidden xl:table-cell">
                            {prod && taxAmt > 0 ? formatCurrency(taxAmt) : <span className="text-slate-300">—</span>}
                          </td>
                        )}

                        {/* Gross Amount */}
                        <td className="px-4 py-4 text-right text-sm font-bold text-black-600">
                          {prod ? formatCurrency(grossAmount) : <span className="text-slate-300">—</span>}
                        </td>

                        {/* Delete */}
                        <td className="px-3 py-4 text-center">
                          <button
                            onClick={() => removeQuickRow(row.id)}
                            title="Remove item"
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all mx-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary (Right Aligned) */}
          <div className="flex justify-end mt-4">
            <div className="w-full md:w-[380px] bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                <span className="uppercase tracking-widest text-xs">Total Gross</span>
                <span className="text-slate-800">{formatCurrency(totalGrossAmount)}</span>
              </div>
              
              {!isNonTaxCustomer && (
                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                  <span className="uppercase tracking-widest text-xs">Total Tax</span>
                  <span className="text-slate-800">{formatCurrency(totalTaxAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-sm font-bold text-emerald-600 pb-4 border-b border-slate-100">
                <span className="uppercase tracking-widest text-xs">Total Discount</span>
                <span>-{formatCurrency(totalDiscountAmount)}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-orange-700 uppercase tracking-widest">Grand Total</span>
                <span className="text-2xl font-black text-orange-700">{formatCurrency(finalAmount)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="mt-5 max-w-screen-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 last:border-b-0 animate-pulse">
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 bg-slate-200 rounded-full w-2/5" />
                  <div className="h-2.5 bg-slate-100 rounded-full w-1/4" />
                </div>
                <div className="h-5 bg-slate-200 rounded-full w-20" />
                <div className="h-10 bg-slate-100 rounded-xl w-28" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !allProducts.length && (
          <div className="text-center py-24 mt-5 max-w-screen-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">No products available</h3>
            <p className="text-sm text-slate-500 font-medium">Please check back later or adjust your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}