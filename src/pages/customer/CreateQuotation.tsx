import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import type { RootState } from '../../store/store';
import { productsApi } from '../../services/api/productsApi';
import { customersApi } from '../../services/api/customersApi';
import { customerCreateQuotation } from '../../services/api/quotationApi';
import { ChevronDown, Package, FileText, Trash2, Loader2 } from 'lucide-react';
import type { Product } from '../../types/product.types';
import { formatCurrency } from '../../utils/formatters';
import { calculateLine, taxCodeToRate } from '../../utils/calculations';

/* ─────────────────────────────────────────────
   Custom White Dropdown Component (Black & White Theme)
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

    const top = shouldDropUp ? rect.top - (dropdownMaxHeight <= availableAbove ? dropdownMaxHeight : availableAbove) : rect.bottom;
    const maxHeight = shouldDropUp ? Math.min(dropdownMaxHeight, availableAbove) : Math.min(dropdownMaxHeight, availableBelow);

    setFloatingStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      top: shouldDropUp ? undefined : top,
      bottom: shouldDropUp ? window.innerHeight - rect.top : undefined,
      maxHeight,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
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
      <div className="relative flex items-center">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          placeholder="Search product…"
          onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(0); }}
          onFocus={() => { setOpen(true); setHighlighted(0); }}
          onKeyDown={handleKeyDown}
          className="w-full pl-2 pr-7 py-2 text-[11px] font-bold text-black bg-transparent border-transparent focus:outline-none focus:ring-0 focus:border-transparent resize-none overflow-hidden placeholder-gray-400"
          style={{ minHeight: '32px' }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}
          className="absolute right-2 top-2 text-black transition"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="w-full max-w-full rounded-xl overflow-hidden overflow-x-hidden bg-white border border-gray-200"
          style={{ ...floatingStyle, boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)' }}
        >
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-[10px] font-bold text-black uppercase tracking-widest">Products</span>
            <span className="text-[10px] text-gray-500 font-medium">{filtered.length} results</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Package className="w-7 h-7 text-gray-300 mx-auto mb-2" />
              <p className="text-[11px] text-black font-medium">No products found</p>
            </div>
          ) : (
            <ul
              ref={listRef}
              className="max-h-56 overflow-y-auto overflow-x-hidden overscroll-contain"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
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
                  className={`px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-b-0 transition-all duration-100 ${
                    i === highlighted ? 'bg-gray-100 border-l-[3px] border-l-black' : 'border-l-[3px] border-l-transparent hover:bg-gray-50'
                  }`}
                >
                  <p className="text-[10px] font-bold text-black leading-tight" style={{ whiteSpace: 'normal' }}>{p.name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      , document.body)}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
type QuotationRow = {
  id: string;
  product?: Product;
  qty: number;
  requestPrice?: number;
};

export default function CustomerCreateQuotation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSelector((state: RootState) => state.auth);

  const [notes, setNotes] = useState('');
  const [quotationRows, setQuotationRows] = useState<QuotationRow[]>([{ id: crypto.randomUUID(), qty: 1 }]);
  const [rowSearches, setRowSearches] = useState<Record<string, string>>({});

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['customer-products-for-quotation-create'],
    queryFn: () => productsApi.getAllForSelection(),
  });

  const { data: customerProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['customer-profile-for-quotation-create'],
    queryFn: () => customersApi.customerGetProfile().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const isTaxCustomer = ((customerProfile?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'tax');
  const isNonTaxCustomer = !isTaxCustomer;

  const allProducts = Array.isArray(productsData) ? productsData : [];

  const addQuotationRow = () => setQuotationRows(r => [...r, { id: crypto.randomUUID(), qty: 1 }]);
  const setRowSearch = (id: string, value: string) => setRowSearches(cur => ({ ...cur, [id]: value }));

  const updateQuotationRow = (id: string, changes: Partial<QuotationRow>) => {
    setQuotationRows(r => {
      if (changes.product) {
        const dup = r.some(row => row.id !== id && row.product?.id === changes.product?.id);
        if (dup) { toast.error('This product is already selected in another row'); return r; }
      }
      const next = r.map(row => row.id === id ? { ...row, ...changes } : row);
      if (changes.product) setRowSearch(id, changes.product.name);
      return next;
    });
  };

  const removeQuotationRow = (id: string) => {
    setQuotationRows(r => {
      const next = r.filter(row => row.id !== id);
      return next.length ? next : [{ id: crypto.randomUUID(), qty: 1 }];
    });
  };

  useEffect(() => {
    if (quotationRows.length && quotationRows[quotationRows.length - 1].product) addQuotationRow();
  }, [quotationRows]);

  function getCalcInput(product: Product) {
    const isSpecialPrice = product.discountPercent == null && (product.discountAmount || 0) > 0;
    const baseRate = (product.sellingPrice || 0) + (product.discountAmount || 0);
    const rate = isSpecialPrice ? (product.sellingPrice || 0) : baseRate;
    const discountPercent = isSpecialPrice ? 0 : (product.discountPercent ?? 0);
    const taxAmount = isNonTaxCustomer ? 0 : (product.taxAmount ?? 0);
    return { rate, discountPercent, taxAmount, isSpecialPrice };
  }

  const selectedRows = quotationRows.filter((r) => !!r.product);
  
  const quoteTotals = selectedRows.reduce(
    (acc, row) => {
      if (!row.product) return acc;
      const calcInput = getCalcInput(row.product);

      const rowGrossBase = calcInput.rate * row.qty;
      // Per-line tax using taxCode rate for accuracy across mixed tax brackets
      const rowTaxRate = taxCodeToRate(row.product.taxCode);
      const allIncRate = row.product.totalAmount || Math.round(calcInput.rate * (1 + rowTaxRate) * 100) / 100;
      const rowDiscount = isNonTaxCustomer ? allIncRate * row.qty * calcInput.discountPercent / 100 : (rowGrossBase * calcInput.discountPercent) / 100;
      const rowNet = rowGrossBase - rowGrossBase * (calcInput.discountPercent / 100);
      const rowTax = isNonTaxCustomer ? 0 : rowNet * rowTaxRate;
      const nonTaxGross = allIncRate * row.qty;
      const rowGross = isNonTaxCustomer ? nonTaxGross : rowGrossBase;

      return {
        totalItems: acc.totalItems + row.qty,
        totalGross: acc.totalGross + rowGross,
        totalDiscount: acc.totalDiscount + rowDiscount,
        totalTax: acc.totalTax + rowTax,
        totalAmount: acc.totalAmount + (isNonTaxCustomer ? rowGross - rowDiscount : rowNet + rowTax),
      };
    },
    { totalItems: 0, totalGross: 0, totalDiscount: 0, totalTax: 0, totalAmount: 0 }
  );

  const quoteNetAmount = quoteTotals.totalGross - quoteTotals.totalDiscount;

  const createMut = useMutation({
    mutationFn: () =>
      customerCreateQuotation({
        customerId: user?.id || '',
        notes: notes || undefined,
        items: selectedRows.map((r) => {
          const product = r.product as Product;
          const isSpecialPrice = product.discountPercent == null && (product.discountAmount || 0) > 0;
          const discountPercent = isSpecialPrice ? 0 : (product.discountPercent ?? 0);
          return {
            productId: product.id,
            quantity: r.qty,
            expectedPrice: r.requestPrice && r.requestPrice > 0 ? r.requestPrice : undefined,
            discountPercent,
          };
        }),
      }),
    onSuccess: () => {
      toast.success('Quotation request submitted!');
      queryClient.invalidateQueries({ queryKey: ['customer-quotations'] });
      navigate('/shop/quotations');
    },
    onError: () => toast.error('Failed to submit quotation'),
  });

  if (isProfileLoading || isProductsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-500 text-lg font-medium gap-3">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading data...
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 px-4 lg:px-0">
        <div>
          <h1 className="text-2xl font-bold text-black">Request Quotation</h1>
          <p className="text-sm text-gray-500 mt-1">Select items using the table and optionally enter a request price</p>
        </div>
      </div>

      <div className="px-4 lg:px-0">
        <div className="max-w-screen-xl mx-auto overflow-visible space-y-4">

          {/* Separate Header Box */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border border-gray-200 bg-white rounded-2xl shadow-sm gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-black" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black flex items-center gap-2">
                  Quotation Items Selection
                </h2>
                <p className="text-[11px] text-gray-500">Choose products, adjust quantities and request a custom price</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/shop/quotations')}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all flex-1 sm:flex-none text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => createMut.mutate()}
                disabled={selectedRows.length === 0 || createMut.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow hover:bg-gray-800 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none"
              >
                {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Quotation
              </button>
            </div>
          </div>

          {/* Table Container (Full Width) */}
          <div className="overflow-x-auto overflow-y-visible pb-10">
            <table className="w-full table-auto text-[11px] text-black font-normal bg-white rounded-xl shadow-sm border border-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '950px' }}>
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-center px-2 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 rounded-tl-xl w-8">#</th>
                  <th className="text-left px-3 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 whitespace-nowrap">Item Code</th>
                  <th className="text-left px-3 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300" style={{ minWidth: 260 }}>
                    Item Description
                  </th>
                  <th className="text-center px-3 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 whitespace-nowrap">Qty</th>
                  <th className="text-right px-3 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 whitespace-nowrap">Rate</th>
                  <th className="text-right px-3 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 whitespace-nowrap">Disc %</th>
                  <th className="text-right px-3 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 whitespace-nowrap">Disc Amt</th>
                  {!isNonTaxCustomer && <th className="text-center px-3 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 whitespace-nowrap">Tax</th>}
                  <th className="text-right px-3 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 whitespace-nowrap">Line Gross</th>
                  <th className="text-right px-3 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 whitespace-nowrap bg-orange-50/30">Req. Price</th>
                  <th className="text-center px-1.5 py-3 font-bold text-black text-[10px] uppercase tracking-widest border-b border-gray-300 rounded-tr-xl whitespace-nowrap w-[56px]">Action</th>
                </tr>
              </thead>

              <tbody>
                {quotationRows.map((row, rowIndex) => {
                  const prod = row.product;
                  const selectedProductIds = new Set(
                    quotationRows.filter(r => r.id !== row.id && r.product).map(r => r.product!.id)
                  );

                  let rate = 0, discPct = 0, discAmt = 0, grossAmount = 0;
                  if (prod) {
                    const pricing = getCalcInput(prod);
                    rate = pricing.rate;
                    discPct = pricing.discountPercent;
                    const lineTaxRate = taxCodeToRate(prod.taxCode);
                    const allIncRate = prod.totalAmount || Math.round(rate * (1 + lineTaxRate) * 100) / 100;
                    discAmt = pricing.isSpecialPrice ? 0 : (isNonTaxCustomer ? allIncRate * row.qty * discPct / 100 : (prod.discountAmount || 0));
                    const baseAmount = rate * row.qty;
                    grossAmount = isNonTaxCustomer ? allIncRate * row.qty : baseAmount;
                  }

                  const isEven = rowIndex % 2 === 0;

                  return (
                    <tr
                      key={row.id}
                      className={`group transition-colors ${
                        prod
                          ? (isEven ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/50')
                          : (isEven ? 'bg-gray-50/50 hover:bg-gray-100/50' : 'bg-white hover:bg-gray-50')
                      }`}
                    >
                      {/* # */}
                      <td className="px-2 py-2 border-b border-gray-100 text-center text-[10px] text-black">{rowIndex + 1}</td>

                      {/* Item Code (SKU) */}
                      <td className="px-3 py-2 border-b border-gray-100 whitespace-nowrap">
                        {prod?.sku
                          ? <span className="font-mono text-[10px] text-black">{prod.sku}</span>
                          : <span className="text-black">—</span>
                        }
                      </td>

                      {/* Item Description */}
                      <td className="px-2 py-2 border-b border-gray-100 whitespace-normal" style={{ minWidth: 260 }}>
                        <ProductDropdown
                          rowId={row.id}
                          value={rowSearches[row.id] !== undefined ? rowSearches[row.id] : (prod?.name || '')}
                          products={allProducts}
                          selectedProductIds={selectedProductIds}
                          currentProductId={prod?.id}
                          onChange={val => {
                            setRowSearch(row.id, val);
                            if (!val.trim()) updateQuotationRow(row.id, { product: undefined });
                          }}
                          onSelect={selectedProduct => {
                            updateQuotationRow(row.id, { product: selectedProduct, qty: 1, requestPrice: undefined });
                            if (quotationRows[quotationRows.length - 1].id === row.id) addQuotationRow();
                          }}
                        />
                      </td>

                      {/* Qty */}
                      <td className="px-1.5 py-2 border-b border-gray-100 text-center w-[56px]">
                        <input
                          type="number" min={1} value={row.qty} disabled={!prod}
                          onChange={e => updateQuotationRow(row.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-14 text-center font-bold text-[11px] text-black bg-transparent border-transparent focus:outline-none focus:ring-0 focus:border-transparent disabled:opacity-40 transition-all no-number-spin"
                        />
                      </td>

                      {/* Rate */}
                      <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap text-black font-bold">
                        {prod ? formatCurrency(isNonTaxCustomer ? (prod.totalAmount || rate * (1 + taxCodeToRate(prod.taxCode))) : rate) : <span className="text-black">—</span>}
                      </td>

                      {/* Disc % */}
                      <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap text-black font-bold">
                        {prod ? `${discPct}%` : <span className="text-black">—</span>}
                      </td>

                      {/* Disc Amt */}
                      <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap text-black font-bold">
                        {prod ? formatCurrency(discAmt) : <span className="text-black">—</span>}
                      </td>

                      {/* Tax code — tax customers only */}
                      {!isNonTaxCustomer && (
                        <td className="px-3 py-2 border-b border-gray-100 text-center whitespace-nowrap text-black font-bold">
                          {prod ? (prod.taxCode || <span className="text-black">—</span>) : <span className="text-black">—</span>}
                        </td>
                      )}

                      {/* Line Gross */}
                      <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap text-black font-bold">
                        {prod ? formatCurrency(grossAmount) : <span className="text-black">—</span>}
                      </td>

                      {/* Request Price */}
                      <td className="px-2 py-2 border-b border-gray-100 text-right bg-orange-50/10">
                        {prod ? (
                           <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            value={row.requestPrice != null ? row.requestPrice.toString() : ''}
                            onChange={e => {
                              const text = e.target.value;
                              const parsed = parseFloat(text);
                              updateQuotationRow(row.id, { requestPrice: Number.isNaN(parsed) ? undefined : parsed });
                            }}
                            placeholder="Optional"
                            className="w-20 text-right font-bold text-[11px] text-orange-600 bg-transparent border-b border-transparent focus:border-orange-400 outline-none transition-all placeholder-gray-300"
                          />
                        ) : (
                          <span className="text-black mr-2">—</span>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-2 border-b border-gray-100 text-center">
                        <button
                          onClick={() => removeQuotationRow(row.id)}
                          title="Remove row"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:text-gray-600 transition mx-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Bottom Layout: Notes & Summary */}
            <div className="mt-5 flex flex-col md:flex-row justify-between gap-6">
              
              {/* Notes Section */}
              <div className="flex-1 max-w-lg space-y-2">
                <label className="block text-xs font-bold text-black uppercase tracking-widest">Notes <span className="text-gray-400 normal-case font-medium">(Optional)</span></label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  rows={4} 
                  placeholder="Add any special requests or notes here..." 
                  className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl text-sm font-medium resize-none shadow-sm focus:outline-none focus:ring-0 focus:border-transparent" 
                />
              </div>

              {/* Order Summary */}
              <div className="w-full md:w-auto min-w-[320px] rounded-xl border border-gray-200 bg-white shadow-sm p-4 h-fit">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-black uppercase tracking-wider font-bold">Total Items</div>
                    <div className="text-sm font-bold text-black">{quoteTotals.totalItems}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-black uppercase tracking-wider font-bold">Gross Amount</div>
                    <div className="text-sm font-bold text-black">{formatCurrency(quoteTotals.totalGross)}</div>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <div className="text-xs text-orange-500 uppercase tracking-wider font-bold">Discount Amount</div>
                    <div className="text-sm font-bold text-orange-500">-{formatCurrency(quoteTotals.totalDiscount)}</div>
                  </div>
                  {!isNonTaxCustomer && (
                    <>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-black uppercase tracking-wider font-bold">Net Amount</div>
                        <div className="text-sm font-bold text-black">{formatCurrency(quoteNetAmount)}</div>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                        <div className="text-xs text-black uppercase tracking-wider font-bold">Total Tax Amount</div>
                        <div className="text-sm font-bold text-black">{formatCurrency(quoteTotals.totalTax)}</div>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-bold text-black uppercase tracking-wider">Total Invoice Value</span>
                    <span className="text-xl font-bold text-black">{formatCurrency(quoteTotals.totalAmount)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}