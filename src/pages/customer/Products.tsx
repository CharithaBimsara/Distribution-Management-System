import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productsApi } from '../../services/api/productsApi';
import { addToCart, updateQuantity, removeFromCart } from '../../store/slices/cartSlice';
import type { RootState } from '../../store/store';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Package, Store } from 'lucide-react';
import type { Product } from '../../types/product.types';
import { formatCurrency } from '../../utils/formatters';

import CartDrawer from '../../components/cart/CartDrawer';
import QuantityModal from '../../components/common/QuantityModal';

export default function CustomerProducts() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState<number | ''>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | ''>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string | null>(null);
  const [isFeaturedFilter, setIsFeaturedFilter] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Read URL params on mount
  useEffect(() => {
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const searchQuery = searchParams.get('search');
    
    if (category) setCategoryFilter(category);
    if (featured === 'true') setIsFeaturedFilter(true);
    if (searchQuery) setSearch(searchQuery);
  }, [searchParams]);

  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);

  // quantity modal (opened via long-press)
  const [qtyModalOpen, setQtyModalOpen] = useState(false);
  const [qtyModalProduct, setQtyModalProduct] = useState<Product | null>(null);
  const [qtyModalValue, setQtyModalValue] = useState('1');

  const getCartQty = useCallback((productId: string) => {
    return cartItems.find(i => i.productId === productId)?.quantity ?? 0;
  }, [cartItems]);

  const cartTotal = cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const { data: categories } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => productsApi.customerCategories().then(r => r.data.data),
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (filtersOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [filtersOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-products', page, search, categoryFilter, brandFilter, minPriceFilter, maxPriceFilter, availabilityFilter, isFeaturedFilter, sortBy, sortDir],
    queryFn: () => productsApi.customerCatalog({
      page,
      pageSize: 30,
      search: search || undefined,
      categoryId: categoryFilter || undefined,
      brand: brandFilter || undefined,
      minPrice: minPriceFilter || undefined,
      maxPrice: maxPriceFilter || undefined,
      availability: availabilityFilter || undefined,
      isFeatured: isFeaturedFilter ?? undefined,
      sortBy,
      sortDir,
    }).then(r => r.data.data),
  });

  const suggestedBrands = useMemo(() => {
    const items = data?.items || [];
    return Array.from(new Set(items.map((i: Product) => i.brand).filter(Boolean))).slice(0, 10) as string[];
  }, [data]);

  const handleIncrement = (product: Product) => {
    const qty = getCartQty(product.id);
    const stock = typeof product.stockQuantity === 'number' ? product.stockQuantity : undefined;
    const allowBackorder = !!product.allowBackorder;
    const productLimit = typeof product.backorderLimit === 'number' ? product.backorderLimit : undefined;

    // determine maximum allowed total quantity for this product in cart
    const maxAllowed = productLimit ?? (allowBackorder ? undefined : stock);

    if (typeof maxAllowed === 'number' && qty >= maxAllowed) {
      toast.error(`Maximum allowed quantity is ${maxAllowed}`);
      return;
    }

    // if backorder NOT allowed, enforce stock limit
    if (!allowBackorder && typeof stock === 'number' && qty >= stock) {
      toast.error(`Only ${stock} left in stock`);
      return;
    }

    if (qty === 0) {
      dispatch(addToCart({
        productId: product.id,
        productName: product.name,
        unitPrice: product.sellingPrice,
        quantity: 1,
        unit: product.unit,
        imageUrl: product.imageUrl,
        stockQuantity: product.stockQuantity,
        allowBackorder: product.allowBackorder,
        backorderLeadTimeDays: product.backorderLeadTimeDays,
        backorderLimit: product.backorderLimit,
      }));
    } else {
      dispatch(updateQuantity({ productId: product.id, quantity: qty + 1 }));
    }
  }; 

  const handleDecrement = (product: Product) => {
    const qty = getCartQty(product.id);
    if (qty <= 1) {
      dispatch(removeFromCart(product.id));
    } else {
      dispatch(updateQuantity({ productId: product.id, quantity: qty - 1 }));
    }
  };

  const handleOpenQtyModal = (product: Product, initial?: number) => {
    setQtyModalProduct(product);
    setQtyModalValue(String(initial ?? (getCartQty(product.id) || 1)));
    setQtyModalOpen(true);
  };

  const handleQtyModalConfirm = (value: number) => {
    const product = qtyModalProduct;
    if (!product) { setQtyModalOpen(false); return; }

    // enforce client-side limits
    const productLimit = typeof product.backorderLimit === 'number' ? product.backorderLimit : undefined;
    const maxAllowed = productLimit ?? (product.allowBackorder ? undefined : (typeof product.stockQuantity === 'number' ? product.stockQuantity : undefined));
    if (typeof maxAllowed === 'number' && value > maxAllowed) {
      value = maxAllowed;
      toast.error(`Maximum allowed quantity is ${maxAllowed}`);
    }

    const current = getCartQty(product.id);
    if (current === 0) {
      dispatch(addToCart({
        productId: product.id,
        productName: product.name,
        unitPrice: product.sellingPrice,
        quantity: value,
        unit: product.unit,
        imageUrl: product.imageUrl,
        stockQuantity: product.stockQuantity,
        allowBackorder: product.allowBackorder,
        backorderLeadTimeDays: product.backorderLeadTimeDays,
        backorderLimit: product.backorderLimit,
      }));
    } else {
      dispatch(updateQuantity({ productId: product.id, quantity: value }));
    }

    setQtyModalOpen(false);
  };

  const clearFilters = () => {
    setCategoryFilter(null);
    setBrandFilter('');
    setMinPriceFilter('');
    setMaxPriceFilter('');
    setAvailabilityFilter(null);
    setIsFeaturedFilter(null);
    setSortBy('name');
    setSortDir('asc');
    setPage(1);
  };

  const hasActiveFilters = !!(categoryFilter || brandFilter || minPriceFilter || maxPriceFilter || availabilityFilter || isFeaturedFilter);

  const FilterPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? 'space-y-4 p-1' : 'space-y-5'}>
      {/* Category */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
        <select
          value={categoryFilter || ''}
          onChange={(e) => { setCategoryFilter(e.target.value || null); setPage(1); }}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20 outline-none transition"
        >
          <option value="">All Categories</option>
          {categories?.map((c: any) => (
            <option value={c.id} key={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Brand */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Brand</label>
        <input
          list={mobile ? 'brandsMobile' : 'brandsDesktop'}
          value={brandFilter}
          onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}
          placeholder="Search brand..."
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20 outline-none transition"
        />
        <datalist id={mobile ? 'brandsMobile' : 'brandsDesktop'}>
          {suggestedBrands.map(b => <option key={b} value={b} />)}
        </datalist>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price (LKR)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPriceFilter as any}
            onChange={(e) => { setMinPriceFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:border-orange-400 outline-none transition"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxPriceFilter as any}
            onChange={(e) => { setMaxPriceFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:border-orange-400 outline-none transition"
          />
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Availability</label>
        <select
          value={availabilityFilter || ''}
          onChange={(e) => { setAvailabilityFilter(e.target.value || null); setPage(1); }}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-orange-400 outline-none transition"
        >
          <option value="">Any</option>
          <option value="InStock">In Stock</option>
          <option value="OutOfStock">Out of Stock</option>
          <option value="Discontinued">Discontinued</option>
        </select>
      </div>

      {/* Featured toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            checked={!!isFeaturedFilter}
            onChange={(e) => { setIsFeaturedFilter(e.target.checked ? true : null); setPage(1); }}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 rounded-full peer-checked:bg-orange-500 transition-colors duration-200" />
          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">Featured only</span>
      </label>

      {/* Sort */}
      <div className="pt-3 border-t border-slate-100">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sort By</label>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-orange-400 outline-none transition"
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="createdAt">Newest</option>
          </select>
          <select
            value={sortDir}
            onChange={(e) => { setSortDir(e.target.value as 'asc' | 'desc'); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-orange-400 outline-none transition"
          >
            <option value="asc">Low → High</option>
            <option value="desc">High → Low</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-2.5 text-sm font-semibold text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 transition"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  /* ── Quantity Stepper ── */
  const QuantityStepper = ({ product }: { product: Product }) => {
    const qty = getCartQty(product.id);
    const outOfStock = product.availability === 'OutOfStock' || product.availability === 'Discontinued';

    // inline edit state + long-press helper (long-press opens numeric input)
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(String(qty));
    const longPressTimer = useRef<number | null>(null);
    const longPressTriggered = useRef(false);

    useEffect(() => setEditValue(String(qty)), [qty]);

    // open modal on long-press instead of inline input
    const openQtyModalForProduct = (initial?: number) => {
      setQtyModalProduct(product);
      setQtyModalValue(String(initial ?? (qty || 1)));
      setQtyModalOpen(true);
    };

    const startPress = () => {
      longPressTimer.current = window.setTimeout(() => {
        longPressTriggered.current = true;
        openQtyModalForProduct();
      }, 600);
    };
    const cancelPress = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      longPressTriggered.current = false;
    };

    const handlePlusMouseUp = () => {
      cancelPress();
      if (longPressTriggered.current) { longPressTriggered.current = false; return; }
      handleIncrement(product);
    };

    const saveEdit = () => {
      let n = Math.max(1, Math.floor(Number(editValue) || 1));
      const productLimit = typeof product.backorderLimit === 'number' ? product.backorderLimit : undefined;
      const maxAllowed = productLimit ?? (product.allowBackorder ? undefined : (typeof product.stockQuantity === 'number' ? product.stockQuantity : undefined));
      if (typeof maxAllowed === 'number' && n > maxAllowed) {
        n = maxAllowed;
        toast.error(`Maximum allowed quantity is ${maxAllowed}`);
      }
      dispatch(updateQuantity({ productId: product.id, quantity: n }));
      setEditing(false);
    };

    if (outOfStock) {
      return (
        <span className="text-[11px] font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg whitespace-nowrap">
          Out of Stock
        </span>
      );
    }

    if (qty === 0) {
      const disabledAdd = !product.allowBackorder && (outOfStock || (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0));
      return (
        <button
          onClick={() => handleIncrement(product)}
          disabled={disabledAdd}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg shadow-sm active:scale-95 transition-all ${disabledAdd ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'}`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add</span>
        </button>
      );
    }

    const reachedMax = (() => {
      if (typeof product.backorderLimit === 'number') return qty >= product.backorderLimit;
      if (!product.allowBackorder && typeof product.stockQuantity === 'number') return qty >= product.stockQuantity;
      return false;
    })();

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
          onMouseDown={startPress}
          onMouseUp={handlePlusMouseUp}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={handlePlusMouseUp}
          disabled={reachedMax}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition active:scale-90 ${reachedMax ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-500/20'}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  /* ── Product Row ── */
  const ProductRow = ({ product }: { product: Product }) => {
    const qty = getCartQty(product.id);
    const outOfStock = product.availability === 'OutOfStock' || product.availability === 'Discontinued';
    const longName = (product.name || '').length > 12;
    const longDesc = (product.description || '').length > 12;

    return (
      <div
        className={`group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 bg-white border-b border-slate-100 last:border-b-0 hover:bg-orange-50/40 transition-colors ${qty > 0 ? 'bg-orange-50/30' : ''}`}
      >
        {/* Left: Info (name + important details) */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm sm:text-base font-semibold text-slate-900 leading-tight ${longName ? 'line-clamp-2 sm:truncate' : 'truncate'}`}>
            {product.name}
          </h3>

          <p className={`text-[11px] text-slate-400 mt-1 ${longDesc ? 'line-clamp-2 sm:truncate' : 'truncate'}`}>
            {product.description}
          </p>

          <p className="text-[11px] text-slate-500 mt-2">
            {product.unit} : {product.availability === 'InStock' ? 'In stock' : product.availability === 'OutOfStock' ? 'Out of stock' : product.availability} : {product.stockQuantity}
          </p>
          {/* low-stock hint */}
          {typeof product.stockQuantity === 'number' && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
            <div className="text-[11px] text-amber-600 mt-1">Only {product.stockQuantity} left</div>
          )}

          {/* backorder availability hint */}
          {product.allowBackorder && (product.stockQuantity ?? 0) <= 0 && (
            <div className="text-[11px] text-emerald-600 mt-1">Available to order — expected in {product.backorderLeadTimeDays ?? 'TBD'} days</div>
          )}
        </div>

        {/* Center: Price */}
        <div className="flex-shrink-0 text-right mr-1 sm:mr-3">
          <span className="text-sm sm:text-base font-bold text-orange-600 tabular-nums">
            {formatCurrency(product.sellingPrice)}
          </span>
          {qty > 0 && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              = {formatCurrency(product.sellingPrice * qty)}
            </div>
          )}
        </div>

        {/* Right: Quantity Stepper */}
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
            {cartCount > 0 && (
              <button
                onClick={() => setCartDrawerOpen(true)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm shadow-orange-500/20 active:scale-95 transition-all"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="tabular-nums">{cartCount}</span>
                <span className="hidden sm:inline text-orange-100">|</span>
                <span className="hidden sm:inline font-bold text-sm">{formatCurrency(cartTotal)}</span>
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
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden relative flex-shrink-0 p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
              )}
            </button>

            {/* Desktop inline sort */}
            <div className="hidden lg:flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="px-3 py-2.5 rounded-xl bg-slate-50 text-slate-700 text-sm border border-slate-200 focus:outline-none focus:border-orange-400 transition"
              >
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="createdAt">Newest</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => { setSortDir(e.target.value as 'asc' | 'desc'); setPage(1); }}
                className="px-3 py-2.5 rounded-xl bg-slate-50 text-slate-700 text-sm border border-slate-200 focus:outline-none focus:border-orange-400 transition"
              >
                <option value="asc">Low → High</option>
                <option value="desc">High → Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-screen-xl mx-auto lg:grid lg:grid-cols-[240px_1fr] lg:gap-0">

        {/* Desktop sidebar filters */}
        <aside className="hidden lg:block">
          <div className="sticky top-[110px] p-4 border-r border-slate-200/80 bg-white min-h-[calc(100vh-110px)]">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Filters</h4>
            <FilterPanel />
          </div>
        </aside>

        {/* Mobile filter bottom sheet */}
        {filtersOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[60]">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setFiltersOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between px-4 pt-4 pb-3 bg-white border-b border-slate-100 z-10">
                <h4 className="font-bold text-slate-900 text-base">Filters</h4>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <FilterPanel mobile />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="py-3 text-sm font-semibold bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => { clearFilters(); setFiltersOpen(false); }}
                    className="py-3 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Main list content */}
        <div className="pb-24 lg:pb-6">

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 px-3 sm:px-4 lg:px-4 pt-3">
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
              {isFeaturedFilter && (
                <span className="flex items-center gap-1 text-[11px] bg-orange-50 border border-orange-200 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                  Featured
                  <button onClick={() => setIsFeaturedFilter(null)} className="ml-0.5 text-orange-500"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

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
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-4 text-sm font-semibold text-orange-600 hover:underline">
                  Clear all filters
                </button>
              )}
            </div>

          ) : (
            <>
              {/* ── Product List (Rows) ── */}
              <div className="bg-white mt-2 lg:mt-0 divide-y divide-slate-100 border-y border-slate-200/60 lg:border-t-0">
                {data.items.map((product: Product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </div>

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
            onClick={() => setCartDrawerOpen(true)}
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
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      <QuantityModal
        open={qtyModalOpen}
        initial={Number(qtyModalValue)}
        min={1}
        max={qtyModalProduct ? (typeof qtyModalProduct.backorderLimit === 'number' ? qtyModalProduct.backorderLimit : (qtyModalProduct.allowBackorder ? undefined : qtyModalProduct.stockQuantity)) : undefined}
        description={qtyModalProduct ? `Edit quantity for ${qtyModalProduct.name}` : undefined}
        onConfirm={handleQtyModalConfirm}
        onCancel={() => setQtyModalOpen(false)}
      />
    </div>
  );
}