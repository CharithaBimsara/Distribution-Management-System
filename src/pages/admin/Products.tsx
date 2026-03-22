import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../services/api/productsApi';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Search, Edit, Trash2, X, Layers, Package, Check, SlidersHorizontal, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import type { Product, Category, CreateProductRequest } from '../../types/product.types';
import toast from 'react-hot-toast';


export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<Product | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  // new two‑level filters
  const [mainFilter, setMainFilter] = useState<string>('');
  const [subFilter, setSubFilter] = useState<string>('');
  // additional important filters
  const [brandFilter, setBrandFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  // no automatic main selection; default is 'all' after import

  // inline editing state (desktop only)
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [editValue, setEditValue] = useState('');
  // when adding new product inline (desktop only)
  const [newProduct, setNewProduct] = useState<Partial<Product> | null>(null);

  // selection / bulk actions
  // selection mode always enabled so checkboxes are visible
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  // single-product delete confirmation
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // close the export dropdown when entering or leaving selection mode so it can't linger
  // no selectionMode effect needed

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  // will declare file-input helpers after categories query

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search, mainFilter, subFilter, brandFilter, minPriceFilter, maxPriceFilter],
    queryFn: () => productsApi.getAll({
      page: 1,
      pageSize: 100000,
      search: search || undefined,
      categoryId: subFilter || mainFilter || undefined,
      brand: brandFilter || undefined,
      minPrice: minPriceFilter ? parseFloat(minPriceFilter) : undefined,
      maxPrice: maxPriceFilter ? parseFloat(maxPriceFilter) : undefined,
    }).then(r => r.data.data),
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => productsApi.getCategories().then(r => r.data.data) });

  // whenever the loaded list changes clear any stray selections
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data?.items]);


  const createMut = useMutation({ mutationFn: (d: CreateProductRequest) => productsApi.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setShowForm(false); toast.success('Product created'); }, onError: () => toast.error('Failed to create product') });

  // delete multiple helper (will run in parallel)
  const deleteMultiple = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await Promise.all(ids.map(id => productsApi.delete(id)));
      toast.success(`${ids.length} products deleted`);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err) {
      console.error('bulk delete failed', err);
      toast.error('Failed to delete selected products');
    }
  };

  const handleDeleteSelected = () => {
    // open confirmation modal instead of deleting immediately
    if (selectedIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    const ids = Array.from(selectedIds);
    deleteMultiple(ids);
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const confirmSingleDelete = () => {
    if (!pendingDeleteId) return;
    deleteMut.mutate(pendingDeleteId);
    setPendingDeleteId(null);
  };
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductRequest> }) => productsApi.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setEditProduct(null); setShowForm(false); toast.success('Product updated'); }, onError: () => toast.error('Failed to update product') });
  const deleteMut = useMutation({ mutationFn: (id: string) => productsApi.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product deleted'); } });

  // handlers for inline edit
  const startEdit = (id: string, field: string, value: string) => {
    if (!isDesktop()) return;
    // if user was editing draft and moves to another column, save previous input
    if (newProduct && editing && editing.id === 'new' && editing.field !== field) {
      setNewProduct(prev => {
        if (!prev) return prev;
        const numFields = ['quantity','sellingPrice','mrp','discountPercent','discountAmount','taxAmount','totalAmount'];
        return { ...prev, [editing.field]: numFields.includes(editing.field) ? parseFloat(editValue) || 0 : editValue };
      });
    }
    setEditing({ id, field });
    setEditValue(value);
  };

  const commitEdit = (productId: string, field: string) => {
    if (!editing || editing.id !== productId || editing.field !== field) return;
    let data: any = {};
    switch (field) {
      case 'quantity':
        data[field] = parseInt(editValue, 10) || 0;
        break;
      case 'sellingPrice':
      case 'discountPercent':
      case 'discountAmount':
      case 'taxAmount':
      case 'totalAmount':
        data[field] = parseFloat(editValue) || 0;
        break;
      default:
        data[field] = editValue;
        break;
    }
    if (productId === 'new' && newProduct) {
      // update draft product
      setNewProduct(prev => ({ ...(prev || {}), [field]: data[field] }));
    } else {
      updateMut.mutate({ id: productId, data });
    }
    setEditing(null);
  };

  const handleKeyDownEdit = (e: React.KeyboardEvent, productId: string, field: string) => {
    if (e.key === 'Enter') {
      (e.target as HTMLElement).blur();
    }
  };
  const categoryMut = useMutation({ mutationFn: (d: { name: string; description?: string; parentCategoryId?: string }) => productsApi.createCategory(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setShowCategoryForm(false); toast.success('Category created'); } });

  // import helpers (must be defined before JSX uses them)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMut = useMutation({
    mutationFn: (payload: { requests: CreateProductRequest[] }) => productsApi.importMultiple(payload),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      // immediately refresh categories and set first main filter now that new list exists
      await queryClient.refetchQueries({ queryKey: ['categories'] });
      // leave mainFilter empty so 'All main categories' is selected
      setMainFilter('');
      setSubFilter('');
      toast.success('Products imported');
    },
    onError: () => toast.error('Import failed'),
  });

  // helper that handles percentage values coming from Excel
  const parsePercentValue = (v: any): number | undefined => {
    if (v == null || v === '') return undefined;
    if (typeof v === 'string') {
      // remove any trailing % and trim
      const cleaned = v.replace('%', '').trim();
      const num = parseFloat(cleaned);
      if (isNaN(num)) return undefined;
      return num;
    }
    if (typeof v === 'number') {
      // Excel often stores 5% as 0.05
      if (v <= 1) return v * 100;
      return v;
    }
    return undefined;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const data = evt.target?.result;
      if (!data) return;
      const workbook = XLSX.read(data, { type: 'binary' });
      const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const items: CreateProductRequest[] = rows.map(r => {
        // import now supports two columns: Main Category and Subcategory
        const mainName: string = r['Main Category'] || r['MainCategory'] || '';
        const subName: string = r['Subcategory'] || r['Sub Category'] || '';
        // attempt to resolve id if the category already exists (search both main and sub entries)
        let cat = categories?.find(c => c.name.toLowerCase() === (subName || mainName).toLowerCase());
        if (!cat && subName && categories) {
          for (const c of categories) {
            const sc = (c.subCategories || []).find((x: any) => x.name.toLowerCase() === subName.toLowerCase());
            if (sc) { cat = sc; break; }
          }
        }
        return {
          name: r['Description'] || r['Name'] || '',
          sku: r['Item'] || r['SKU'] || '',
          barcode: r['Barcode'] || undefined,
          categoryId: cat ? cat.id : undefined, // ignore provided ID, categories wiped prior to import
          mainCategory: mainName || undefined,
          subCategory: subName || undefined,
          brand: r['Brand'] || undefined,
          sellingPrice: parseFloat(r['Rate'] ?? r['Selling Price'] ?? 0) || 0,
          mrp: r['MRP'] || r['M R P'] ? parseFloat(r['MRP'] ?? r['M R P'] ?? 0) : undefined,
          quantity: parseInt(r['Qty'] ?? '0', 10) || 0,
          // support variations in header text (some sheets use "Disc %")
          discountPercent: parsePercentValue(r['Disc%'] ?? r['Disc %'] ?? r['Discount%'] ?? r['Discount %']),
          // allow zero numeric values (don't treat 0 as missing)
          discountAmount: (r['Disc Amt'] !== null && r['Disc Amt'] !== undefined && r['Disc Amt'] !== '') ? parseFloat(r['Disc Amt']) : undefined,
          taxCode: r['Tax'] || r['Tax Code'] || undefined,
          taxAmount: (r['Tax Amt'] !== null && r['Tax Amt'] !== undefined && r['Tax Amt'] !== '') ? parseFloat(r['Tax Amt']) : undefined,
          totalAmount: (r['Amount'] !== null && r['Amount'] !== undefined && r['Amount'] !== '') ? parseFloat(r['Amount']) : undefined,
        } as CreateProductRequest;
      });
      importMut.mutate({ requests: items });
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // export helper (defined before return)
  const exportProducts = async (format: 'excel' | 'pdf', onlySelected = false) => {
    try {
      // if onlySelected is true and we have IDs, export from cached data rather than refetch
      let items: Product[] = [];
      if (onlySelected && selectedIds.size > 0 && data?.items) {
        items = data.items.filter(p => selectedIds.has(p.id));
      } else {
        const resp = await productsApi.getAll({ page: 1, pageSize: 10000, search: search || undefined, categoryId: subFilter || mainFilter || undefined, brand: brandFilter || undefined, minPrice: minPriceFilter ? parseFloat(minPriceFilter) : undefined, maxPrice: maxPriceFilter ? parseFloat(maxPriceFilter) : undefined });
        items = resp.data.data.items;
      }

      if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        const dataForSheet = items.map(p => ({
          Description: p.name,
          Item: p.sku,
          Rate: p.sellingPrice,
          MRP: p.mrp ?? '',
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
        const jsPDFModule = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDFModule.jsPDF();
        const cols = ['Description','Item','Rate','MRP','Qty','Disc%','Disc Amt','Tax','Tax Amt','Amount'];
        const rows = items.map(p => [
          p.name, p.sku, p.sellingPrice, p.mrp ?? '', p.quantity,
          p.discountPercent ?? '', p.discountAmount ?? '', p.taxCode||'', p.taxAmount ?? '', p.totalAmount ?? ''
        ]);
        // use explicit plugin invocation
        autoTable(doc, { head: [cols], body: rows, startY: 20, styles: { fontSize: 8 } });
        doc.save('products-export.pdf');
      }
    } catch (err) {
      console.error('export failed', err);
      toast.error('Export failed');
    }
  };

  // --- Confirmation modal (slides in from top) ---
  const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', confirmClass = 'bg-red-600 hover:bg-red-700 text-white' }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; confirmClass?: string }) => {
    if (!open) return null;
    return createPortal(
      <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ pointerEvents: 'auto' }}>
        {/* dark overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCancel} />
        {/* dialog slides down from top */}
        <div
          className="relative mt-16 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 animate-[slideDown_0.25s_ease-out]"
          style={{ animation: 'slideDown 0.25s ease-out both' }}
        >
          <div className="flex items-start gap-4 p-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 pb-5">
            <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${confirmClass}`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your product catalog</p>
      </div>

      {/* ── Modern sticky toolbar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30">
        {/* main bar */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.10)] px-4 py-3 space-y-2.5">

          {/* ── Row 1: search + action buttons ────────────────────────── */}
          <div className="flex items-center gap-2.5 flex-wrap">

            {/* Search – prominent, first */}
            <div className="relative flex-1 min-w-[200px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by name or SKU…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-7 w-px bg-slate-200" />

            {/* Action buttons: only import and add product */}
            <div className="flex items-center gap-1.5">
                {/* Import */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importMut.isPending}
                  title="Import from Excel"
                  className="group/btn relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-sm font-medium transition-all disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>

                {/* Add product */}
                <button
                  onClick={() => {
                    setNewProduct({ id: 'new', name: '', sku: '', sellingPrice: 0, mrp: 0, quantity: 0 });
                    setEditing({ id: 'new', field: 'name' });
                    setEditValue('');
                    if (isDesktop()) {
                      const table = document.querySelector('table');
                      if (table) table.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      setEditProduct(null);
                      setShowForm(true);
                    }
                  }}
                  title="Add product"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-all shadow-sm shadow-indigo-200"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Product</span>
                </button>
            </div>
          </div>

          {/* ── Row 2: filter chips ────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
            </div>
            <select
              value={mainFilter}
              onChange={e => { setMainFilter(e.target.value); setSubFilter(''); setPage(1); }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer"
            >
              <option value="">All categories</option>
              {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={subFilter}
              onChange={e => { setSubFilter(e.target.value); setPage(1); }}
              disabled={!mainFilter}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer disabled:opacity-40"
            >
              <option value="">All subcategories</option>
              {(categories?.find((c: any) => c.id === mainFilter)?.subCategories || []).map((sc: any) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>
            <input
              type="text"
              placeholder="Brand"
              value={brandFilter}
              onChange={e => { setBrandFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition w-24"
            />
            <input
              type="number"
              placeholder="Min ₹"
              value={minPriceFilter}
              onChange={e => { setMinPriceFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition w-20"
            />
            <input
              type="number"
              placeholder="Max ₹"
              value={maxPriceFilter}
              onChange={e => { setMaxPriceFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition w-20"
            />
            {(mainFilter || subFilter || brandFilter || minPriceFilter || maxPriceFilter) && (
              <button
                onClick={() => { setMainFilter(''); setSubFilter(''); setBrandFilter(''); setMinPriceFilter(''); setMaxPriceFilter(''); setPage(1); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* hidden file input */}
        <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </div>

      {/* products listing only */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">

          {isLoading ? <div className="p-12 text-center text-slate-500">Loading products...</div> : !data?.items?.length ? <div className="p-12 text-center"><Package className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No products found</p></div> : (<>
                {/* Mobile: compact card list with small action buttons (mobile-first) */}
            <div className="lg:hidden divide-y divide-slate-100">
              {data.items.map((product: Product) => (
                <div key={product.id} className="p-3 flex items-center gap-3 bg-white border border-slate-200 rounded-xl">
                        <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => {
                      setSelectedIds(prev => {
                        const s = new Set(prev);
                        if (s.has(product.id)) s.delete(product.id);
                        else s.add(product.id);
                        return s;
                      });
                    }} className="shrink-0" />
                  {/* product icon removed for mobile to save space */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{product.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Item: {product.sku}</p>
                      </div>
                      <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">Rate: {formatCurrency(product.sellingPrice)}</p>
                        {product.mrp != null && <p className="text-sm font-semibold text-slate-700">MRP: {formatCurrency(product.mrp)}</p>}
                        <p className={`text-xs mt-1 font-medium ${product.quantity <= 10 ? 'text-red-600' : product.quantity <= 50 ? 'text-amber-600' : 'text-slate-500'}`}>Qty: {product.quantity}</p>
                        {product.discountPercent != null && <p className="text-[10px] text-slate-500 mt-0.5">Disc%: {product.discountPercent}%</p>}
                      </div>
                    </div>

                    {/* divider between product info and actions */}
                    <div className="mt-3 border-t border-slate-100" />

                    {/* Mobile: primary actions */}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/table (unchanged) */}
            <div className="hidden lg:block overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="px-5 py-3.5">
                  <input type="checkbox" checked={data.items.length > 0 && selectedIds.size === data.items.length} onChange={() => {
                    if (selectedIds.size === data.items.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(data.items.map(p => p.id)));
                  }} />
                </th>
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Description</th>
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Item</th>
              <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Qty</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Rate</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">MRP</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Disc %</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Disc Amt</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Tax</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Tax Amt</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Amount</th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              {newProduct && (
                <tr key="new" className="hover:bg-slate-50/60 transition-all group bg-yellow-50">
                  <td />
                  <td className="px-5 py-3.5" onDoubleClick={() => startEdit('new', 'name', newProduct.name || '')}>
                    {editing?.id === 'new' && editing.field === 'name' ?
                      <input
                        autoFocus
                        className="w-full"
                        value={editValue}
                        onBlur={() => commitEdit('new','name')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : <div><p className="font-medium text-slate-900">{newProduct.name || ''}</p></div>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-mono text-xs" onDoubleClick={() => startEdit('new', 'sku', newProduct.sku || '')}>
                    {editing?.id === 'new' && editing.field === 'sku' ?
                      <input
                        autoFocus
                        className="w-full font-mono text-xs"
                        value={editValue}
                        onBlur={() => commitEdit('new','sku')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : newProduct.sku || ''}
                  </td>
                  <td className="px-5 py-3.5 text-center" onDoubleClick={() => startEdit('new', 'quantity', (newProduct.quantity||0).toString())}>
                    {editing?.id === 'new' && editing.field === 'quantity' ?
                      <input
                        type="number"
                        autoFocus
                        className="w-full text-center"
                        value={editValue}
                        onBlur={() => commitEdit('new','quantity')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : newProduct.quantity ?? 0}
                  </td>
                  <td className="px-5 py-3.5 text-right" onDoubleClick={() => startEdit('new', 'sellingPrice', (newProduct.sellingPrice||0).toString())}>
                    {editing?.id === 'new' && editing.field === 'sellingPrice' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        value={editValue}
                        onBlur={() => commitEdit('new','sellingPrice')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : formatCurrency(newProduct.sellingPrice || 0)}
                  </td>
                  <td className="px-5 py-3.5 text-right" onDoubleClick={() => startEdit('new', 'mrp', (newProduct.mrp||0).toString())}>
                    {editing?.id === 'new' && editing.field === 'mrp' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        value={editValue}
                        onBlur={() => commitEdit('new','mrp')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : formatCurrency(newProduct.mrp || 0)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit('new', 'discountPercent', (newProduct.discountPercent||'').toString())}>
                    {editing?.id === 'new' && editing.field === 'discountPercent' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        onBlur={() => commitEdit('new','discountPercent')}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (newProduct.discountPercent != null ? newProduct.discountPercent + '%' : '-')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit('new', 'discountAmount', (newProduct.discountAmount||'').toString())}>
                    {editing?.id === 'new' && editing.field === 'discountAmount' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        onBlur={() => commitEdit('new','discountAmount')}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (newProduct.discountAmount != null ? formatCurrency(newProduct.discountAmount) : '-')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit('new', 'taxCode', newProduct.taxCode || '')}>
                    {editing?.id === 'new' && editing.field === 'taxCode' ?
                      <input
                        autoFocus
                        onBlur={() => commitEdit('new','taxCode')}
                        className="w-full text-right"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (newProduct.taxCode || '-')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit('new', 'taxAmount', (newProduct.taxAmount||'').toString())}>
                    {editing?.id === 'new' && editing.field === 'taxAmount' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        onBlur={() => commitEdit('new','taxAmount')}
                        className="w-full text-right"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (newProduct.taxAmount != null ? formatCurrency(newProduct.taxAmount) : '-')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit('new', 'totalAmount', (newProduct.totalAmount||'').toString())}>
                    {editing?.id === 'new' && editing.field === 'totalAmount' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        onBlur={() => commitEdit('new','totalAmount')}
                        className="w-full text-right"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (newProduct.totalAmount != null ? formatCurrency(newProduct.totalAmount) : '-')}
                  </td>
                  <td className="px-5 py-3.5 text-center"><div className="flex items-center justify-center gap-1">
                    <button onClick={() => {
                        // create or cancel
                        const payload: CreateProductRequest = {
                          name: newProduct.name || '',
                          sku: newProduct.sku || '',
                          sellingPrice: parseFloat(newProduct.sellingPrice?.toString()||'0')||0,
                          mrp: newProduct.mrp != null ? parseFloat(newProduct.mrp?.toString()||'0') : undefined,
                          quantity: parseInt(newProduct.quantity?.toString()||'0')||0,
                          discountPercent: newProduct.discountPercent as any,
                          discountAmount: newProduct.discountAmount as any,
                          taxCode: newProduct.taxCode,
                          taxAmount: newProduct.taxAmount as any,
                          totalAmount: newProduct.totalAmount as any,
                        };
                        createMut.mutate(payload, { onSuccess: () => setNewProduct(null) });
                      }} className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-xl transition"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setNewProduct(null)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"><Trash2 className="w-4 h-4" /></button>
                  </div></td>
                </tr>
              )}
              {data.items.map((product: Product) => (
                <tr key={product.id} className="hover:bg-slate-50/60 transition-all group">
                    <td className="px-5 py-3.5">
                      <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => {
                        setSelectedIds(prev => {
                          const s = new Set(prev);
                          if (s.has(product.id)) s.delete(product.id);
                          else s.add(product.id);
                          return s;
                        });
                      }} />
                    </td>
                  <td className="px-5 py-3.5" onDoubleClick={() => startEdit(product.id, 'name', product.name)}>
                    {editing?.id === product.id && editing.field === 'name' ?
                      <input
                        autoFocus
                        className="w-full"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'name')}
                        onChange={e => setEditValue(e.target.value)}
                        // saving only via explicit button
                      />
                      : <div><p className="font-medium text-slate-900">{product.name}</p></div>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-mono text-xs" onDoubleClick={() => startEdit(product.id, 'sku', product.sku)}>
                    {editing?.id === product.id && editing.field === 'sku' ?
                      <input
                        autoFocus
                        className="w-full font-mono text-xs"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'sku')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : product.sku}
                  </td>
                  <td className="px-5 py-3.5 text-center" onDoubleClick={() => startEdit(product.id, 'quantity', product.quantity.toString())}>
                    {editing?.id === product.id && editing.field === 'quantity' ?
                      <input
                        type="number"
                        autoFocus
                        className="w-full text-center"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'quantity')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : product.quantity}
                  </td>
                  <td className="px-5 py-3.5 text-right" onDoubleClick={() => startEdit(product.id, 'sellingPrice', product.sellingPrice.toString())}>
                    {editing?.id === product.id && editing.field === 'sellingPrice' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'sellingPrice')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : formatCurrency(product.sellingPrice)}
                  </td>
                  <td className="px-5 py-3.5 text-right" onDoubleClick={() => startEdit(product.id, 'mrp', (product.mrp||0).toString())}>
                    {editing?.id === product.id && editing.field === 'mrp' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'mrp')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : formatCurrency(product.mrp || 0)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit(product.id, 'discountPercent', product.discountPercent?.toString() || '')}>
                    {editing?.id === product.id && editing.field === 'discountPercent' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'discountPercent')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (product.discountPercent != null ? product.discountPercent + '%' : '-')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit(product.id, 'discountAmount', product.discountAmount?.toString() || '')}>
                    {editing?.id === product.id && editing.field === 'discountAmount' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'discountAmount')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (product.discountAmount != null ? formatCurrency(product.discountAmount) : '-')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit(product.id, 'taxCode', product.taxCode || '')}>
                    {editing?.id === product.id && editing.field === 'taxCode' ?
                      <input
                        autoFocus
                        className="w-full text-right"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'taxCode')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (product.taxCode || '-')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit(product.id, 'taxAmount', product.taxAmount?.toString() || '')}>
                    {editing?.id === product.id && editing.field === 'taxAmount' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'taxAmount')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (product.taxAmount != null ? formatCurrency(product.taxAmount) : '-')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600" onDoubleClick={() => startEdit(product.id, 'totalAmount', product.totalAmount?.toString() || '')}>
                    {editing?.id === product.id && editing.field === 'totalAmount' ?
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        className="w-full text-right"
                        value={editValue}
                        onBlur={() => commitEdit(product.id,'totalAmount')}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      : (product.totalAmount != null ? formatCurrency(product.totalAmount) : '-')}
                  </td>
                </tr>
              ))}
            </tbody></table></div>
          </>)}
        </div>

      {showForm && <ProductFormModal product={editProduct} onClose={() => { setShowForm(false); setEditProduct(null); }} onSubmit={d => editProduct ? updateMut.mutate({ id: editProduct.id, data: d }) : createMut.mutate(d as CreateProductRequest)} isPending={createMut.isPending || updateMut.isPending} />}
      {showDeleteModal && <DeleteModal product={showDeleteModal} onClose={() => setShowDeleteModal(null)} onSubmit={() => deleteMut.mutate((showDeleteModal as any).id ?? (showDeleteModal as any).productId)} isPending={deleteMut.isPending} />}

      {/* single-product delete confirmation */}
      <ConfirmModal
        open={pendingDeleteId !== null}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={confirmSingleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      {/* bulk delete confirmation */}
      <ConfirmModal
        open={showBulkDeleteConfirm}
        title={`Delete ${selectedIds.size} Product${selectedIds.size === 1 ? '' : 's'}`}
        message={`Are you sure you want to permanently delete ${selectedIds.size} selected product${selectedIds.size === 1 ? '' : 's'}? This action cannot be undone.`}
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />

      {/* Sticky selection action bar */}
      {selectedIds.size > 0 &&
        createPortal(
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 pointer-events-none">
            <div
              className="pointer-events-auto flex items-center gap-2 flex-wrap justify-center px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 mx-4"
              style={{ animation: 'slideDown 0.2s ease-out both' }}
            >
              <span className="text-sm font-semibold text-slate-200">{selectedIds.size} selected</span>
              <div className="h-4 w-px bg-slate-600" />
              <button onClick={() => exportProducts('excel', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button onClick={() => exportProducts('pdf', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition">
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
              <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button onClick={() => { setSelectedIds(new Set()); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function ProductFormModal({ product, onClose, onSubmit, isPending }: { product: Product | null; onClose: () => void; onSubmit: (d: Partial<CreateProductRequest>) => void; isPending: boolean }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    sellingPrice: product?.sellingPrice?.toString() || '0',
    mrp: product?.mrp?.toString() || '',
    quantity: product?.quantity?.toString() || '0',
    discountPercent: product?.discountPercent?.toString() || '',
    discountAmount: product?.discountAmount?.toString() || '',
    taxCode: product?.taxCode || '',
    taxAmount: product?.taxAmount?.toString() || '',
    totalAmount: product?.totalAmount?.toString() || ''
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      sku: form.sku,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      quantity: parseInt(form.quantity) || 0,
      discountPercent: form.discountPercent ? parseFloat(form.discountPercent) : undefined,
      discountAmount: form.discountAmount ? parseFloat(form.discountAmount) : undefined,
      taxCode: form.taxCode || undefined,
      taxAmount: form.taxAmount ? parseFloat(form.taxAmount) : undefined,
      totalAmount: form.totalAmount ? parseFloat(form.totalAmount) : undefined,
      mrp: form.mrp ? parseFloat(form.mrp) : undefined,
    });
  };
  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';

  const queryClient = useQueryClient();


  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isDesktop()) {
      document.body.style.overflow = 'hidden';
      try { window.scrollTo({ top: 0, behavior: 'instant' as any }); } catch {}
    }
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (typeof window !== 'undefined' && isDesktop()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold text-slate-900">{product ? 'Edit Product' : 'New Product'}</h2><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label><input required value={form.sku} onChange={e => set('sku', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Selling Price *</label><input required type="number" step="0.01" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">MRP</label><input type="number" step="0.01" value={form.mrp} onChange={e => set('mrp', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label><input required type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Discount %</label><input type="number" step="0.01" value={form.discountPercent} onChange={e => set('discountPercent', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Discount Amount</label><input type="number" step="0.01" value={form.discountAmount} onChange={e => set('discountAmount', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Tax Code</label><input value={form.taxCode} onChange={e => set('taxCode', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Tax Amount</label><input type="number" step="0.01" value={form.taxAmount} onChange={e => set('taxAmount', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Total Amount</label><input type="number" step="0.01" value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)} className={inputCls} /></div>
            </div>
            <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Saving...' : product ? 'Update' : 'Create'}</button></div>
          </form>
        </div>
      </div>
    );
  }

  // Mobile: bottom-sheet (portal) — match RecordPaymentSheet UI
  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
        <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg">{product ? 'Edit Product' : 'New Product'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label><input required value={form.sku} onChange={e => set('sku', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Selling Price *</label><input required type="number" step="0.01" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label><input required type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Discount %</label><input type="number" step="0.01" value={form.discountPercent} onChange={e => set('discountPercent', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Discount Amount</label><input type="number" step="0.01" value={form.discountAmount} onChange={e => set('discountAmount', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Tax Code</label><input value={form.taxCode} onChange={e => set('taxCode', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Tax Amount</label><input type="number" step="0.01" value={form.taxAmount} onChange={e => set('taxAmount', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Total Amount</label><input type="number" step="0.01" value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)} className={inputCls} /></div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={onClose} className="w-full py-2.5 bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
              <button type="submit" disabled={isPending} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{isPending ? 'Saving...' : product ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}




function CategoryFormModal({ onClose, onSubmit, isPending }: { onClose: () => void; onSubmit: (d: { name: string; description?: string; parentCategoryId?: string }) => void; isPending: boolean }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [parentId, setParentId] = useState('');
  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => productsApi.getCategories().then(r => r.data.data) });

  if (typeof window !== 'undefined' && isDesktop()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">New Category</h2>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Parent Category (optional)</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)} className={inputCls + ' cursor-pointer'}>
              <option value="">None</option>
              {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} className={inputCls + ' resize-none'} /></div>
        </div>
        <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit({ name, description: desc || undefined })} disabled={isPending || !name} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Creating...' : 'Create'}</button></div>
      </div></div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
        <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg">New Category</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Parent Category (optional)</label>
              <select value={parentId} onChange={e => setParentId(e.target.value)} className={inputCls + ' cursor-pointer'}>
                <option value="">None</option>
                {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} className={inputCls + ' resize-none'} /></div>
          </div>
          <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit({ name, description: desc || undefined, parentCategoryId: parentId || undefined })} disabled={isPending || !name} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Creating...' : 'Create'}</button></div>
        </div>
      </div>
    </div>,
    document.body
  );
}


 

function DeleteModal({ product, onClose, onSubmit, isPending }: { product: Product; onClose: () => void; onSubmit: () => void; isPending: boolean }) {
  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  const displayName = (product && 'name' in product) ? (product as Product).name : (product as any).productName;

  if (typeof window !== 'undefined' && isDesktop()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Delete product</h2><p className="text-sm text-slate-500 mb-4">Are you sure you want to delete <strong>{displayName}</strong>? This action cannot be undone.</p>
        <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit()} disabled={isPending} className="flex-1 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Deleting...' : 'Delete product'}</button></div>
      </div></div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
        <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg">Delete product</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">Are you sure you want to delete <strong>{displayName}</strong>? This action cannot be undone.</p>
          <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit()} disabled={isPending} className="flex-1 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Deleting...' : 'Delete product'}</button></div>
        </div>
      </div>
    </div>,
    document.body
  );
}
