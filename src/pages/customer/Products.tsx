import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productsApi } from '../../services/api/productsApi';
import { customersApi } from '../../services/api/customersApi';
import { addToCart, updateQuantity, removeFromCart, clearCart } from '../../store/slices/cartSlice';
import type { RootState } from '../../store/store';
import { SlidersHorizontal, ChevronLeft, ChevronRight, Minus, Plus, Package, Store } from 'lucide-react';
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
  const updateQuickRow = (id: string, changes: Partial<QuickRow>) => setQuickRows(r => {
    if (changes.product) {
      const duplicateExists = r.some(row => row.id !== id && row.product?.id === changes.product?.id);
      if (duplicateExists) {
        toast.error('This product is already selected in another row');
        return r;
      }
    }
    return r.map(row => row.id === id ? { ...row, ...changes } : row);
  });
  const removeQuickRow = (id: string) => setQuickRows(r => {
    const next = r.filter(row => row.id !== id);
    return next.length ? next : [{ id: crypto.randomUUID(), qty: 1 }];
  });

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

  // API sellingPrice is post-discount. Rebuild the base rate when a discount override is active.
  const getBaseRate = (p: Product) => (p.sellingPrice || 0) + (p.discountAmount || 0);

  const getCalcInput = (p: Product) => {
    const isSpecialPrice = (p.discountPercent == null) && ((p.discountAmount || 0) > 0);
    const rate = isSpecialPrice ? (p.sellingPrice || 0) : getBaseRate(p);
    const discountPercent = isSpecialPrice ? 0 : (p.discountPercent ?? 0);
    const taxAmount = p.taxAmount ?? 0;
    return { rate, discountPercent, taxAmount, isSpecialPrice };
  };

  // quick order totals
  // count number of filled rows (distinct products) for quick order
  const quickCount = quickRows.filter(r => !!r.product).length;
  // calculate quick order total using dynamic formula rather than stored totals
  const quickTotal = quickRows.reduce((s, r) => {
    if (!r.product) return s;
    const pricing = getCalcInput(r.product);
    const calc = calculateLine({
      rate: pricing.rate,
      qty: r.qty,
      discountPercent: pricing.discountPercent,
      taxAmount: pricing.taxAmount,
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
        const pricing = getCalcInput(prod);
        // derive tax rate from stored tax amount
        let taxRate = 0;
        if (pricing.taxAmount != null) {
          const basePerUnit = pricing.rate * (1 - pricing.discountPercent / 100);
          if (basePerUnit > 0) taxRate = pricing.taxAmount / basePerUnit;
        }
        const calc = calculateLine({
          rate: pricing.rate,
          qty: r.qty,
          discountPercent: pricing.discountPercent,
          taxAmount: pricing.taxAmount,
        });
        dispatch(addToCart({
          lineId: r.id,
          productId: prod.id,
          productName: prod.name,
          unitPrice: pricing.rate,
          quantity: r.qty,
          sku: prod.sku,
          discountPercent: pricing.discountPercent,
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

  const { data: customerProfile } = useQuery({
    queryKey: ['customer-profile-for-order-table-tax-mode'],
    queryFn: () => customersApi.customerGetProfile().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const isNonTaxCustomer = ((customerProfile?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax');

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
    const pricing = getCalcInput(product);
    let taxRate = 0;
    if (pricing.taxAmount != null) {
      const basePerUnit = pricing.rate * (1 - pricing.discountPercent / 100);
      if (basePerUnit > 0) taxRate = pricing.taxAmount / basePerUnit;
    }
    if (qty === 0) {
      const calc = calculateLine({
        rate: pricing.rate,
        qty: 1,
        discountPercent: pricing.discountPercent,
        taxAmount: pricing.taxAmount,
      });
      dispatch(addToCart({
        lineId: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        unitPrice: pricing.rate,
        quantity: 1,
        sku: product.sku,
        discountPercent: pricing.discountPercent,
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

  const goToCreateOrder = () => {
    dispatch(clearCart());
    quickRows.forEach(r => {
      if (!r.product) return;
      const prod = r.product;
      const pricing = getCalcInput(prod);
      let taxRate = 0;
      if (pricing.taxAmount != null) {
        const basePerUnit = pricing.rate * (1 - pricing.discountPercent / 100);
        if (basePerUnit > 0) taxRate = pricing.taxAmount / basePerUnit;
      }
      const calc = calculateLine({
        rate: pricing.rate,
        qty: r.qty,
        discountPercent: pricing.discountPercent,
        taxAmount: pricing.taxAmount,
      });
      dispatch(addToCart({
        productId: prod.id,
        productName: prod.name,
        unitPrice: pricing.rate,
        quantity: r.qty,
        sku: prod.sku,
        discountPercent: pricing.discountPercent,
        taxRate,
        lineTotal: calc.total,
      }));
    });
    navigate('/shop/checkout');
  };

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6 pb-20">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Order</h1>
          <p className="text-sm text-slate-500 mt-1">Select products using the table and create your order</p>
        </div>
      </div>

      <div className="px-4 lg:px-0">
        <div className="max-w-screen-xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Product Selection Table</h2>
            </div>
            <p className="text-xs text-slate-500">{quickCount} items selected</p>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full table-auto text-[11px] border border-slate-300 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="text-left px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Description</th>
                  <th className="whitespace-nowrap text-left px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Item</th>
                  <th className="whitespace-nowrap text-center px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Qty</th>
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Rate</th>
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">MRP</th>
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Disc %</th>
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Disc Amt</th>
                  {!isNonTaxCustomer && <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Tax</th>}
                  {!isNonTaxCustomer && <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Tax Amt</th>}
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide border-r border-slate-300">Amount</th>
                  <th className="whitespace-nowrap text-center px-2 py-2 font-semibold text-slate-700 text-[9px] uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quickRows.map(row => {
                  const prod = row.product;
                  const selectedProductIds = new Set(
                    quickRows
                      .filter(r => r.id !== row.id && r.product)
                      .map(r => r.product!.id)
                  );
                  let rate = 0;
                  let discPct = 0;
                  let discAmt = 0;
                  let taxAmt = 0;
                  let amount = 0;
                  if (prod) {
                    const pricing = getCalcInput(prod);
                    rate = pricing.rate;
                    discPct = pricing.discountPercent;
                    discAmt = pricing.isSpecialPrice ? 0 : (prod.discountAmount || 0);
                    taxAmt = isNonTaxCustomer ? 0 : (prod.taxAmount || 0);
                    amount = (rate * row.qty) - (discAmt * row.qty) + (taxAmt * row.qty);
                  }
                  return (
                    <tr key={row.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50 hover:bg-orange-50/40 transition-colors">
                      <td className="px-2 py-1.5 border border-slate-200 align-top min-w-[260px]">
                        <select
                          value={prod?.id || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedProduct = ((data?.items || []) as Product[]).find((p) => p.id === selectedId);
                            if (!selectedProduct) return;
                            updateQuickRow(row.id, { product: selectedProduct, qty: 1 });
                            if (quickRows[quickRows.length - 1].id === row.id) addQuickRow();
                          }}
                          className="w-full border border-slate-300 rounded-md px-2 py-1 bg-white text-[11px]"
                        >
                          <option value="">Select product</option>
                          {((data?.items || []) as Product[]).map((option) => (
                            <option
                              key={option.id}
                              value={option.id}
                              disabled={selectedProductIds.has(option.id)}
                            >
                              {option.name} ({option.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-slate-600 font-mono text-[10px] border border-slate-200 whitespace-nowrap">{prod?.sku || ''}</td>
                      <td className="px-2 py-1.5 text-center border border-slate-200">
                        <input
                          type="number"
                          min={1}
                          value={row.qty}
                          disabled={!prod}
                          onChange={e => updateQuickRow(row.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-14 text-center text-[11px] border border-slate-300 rounded-md px-1 py-0.5 focus:ring-2 focus:ring-orange-300/30 focus:border-orange-400 no-number-spin"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right border border-slate-200 whitespace-nowrap">{prod ? formatCurrency(rate) : ''}</td>
                      <td className="px-3 py-1.5 text-right border-r border-slate-200 whitespace-nowrap">{prod?.mrp != null ? formatCurrency(prod.mrp) : ''}</td>
                      <td className="px-3 py-1.5 text-right border-r border-slate-200 whitespace-nowrap">{prod ? discPct : ''}</td>
                      <td className="px-3 py-1.5 text-right border-r border-slate-200 whitespace-nowrap">{prod ? formatCurrency(discAmt) : ''}</td>
                      {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right border-r border-slate-200 whitespace-nowrap">{prod?.taxCode || ''}</td>}
                      {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right border-r border-slate-200 whitespace-nowrap">{prod ? formatCurrency(taxAmt) : ''}</td>}
                      <td className="px-3 py-1.5 text-right font-bold border-r border-slate-200 whitespace-nowrap">{prod ? formatCurrency(amount) : ''}</td>
                      <td className="px-2 py-1.5 text-center border-slate-200">
                        <button
                          onClick={() => removeQuickRow(row.id)}
                          className="px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition"
                          title="Delete row"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button
              onClick={addQuickRow}
              className="mt-3 w-full py-2 text-xs font-semibold border border-dashed border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            >
              + Add Row
            </button>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Amount</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{formatCurrency(quickTotal)}</p>
              </div>
              <button
                onClick={goToCreateOrder}
                disabled={quickCount === 0}
                className="px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-orange-700 transition"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-2 max-w-screen-xl mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden">
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
          <div className="text-center py-20 mt-3 max-w-screen-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-base">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          data.totalPages > 1 && (
            <div className="max-w-screen-xl mx-auto flex items-center justify-between px-4 pt-5">
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
          )
        )}
      </div>

    </div>
  );
}