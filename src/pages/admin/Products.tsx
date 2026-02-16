import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../services/api/productsApi';
import { formatCurrency, statusColor } from '../../utils/formatters';
import { Plus, Search, Edit, Trash2, Package, X, AlertTriangle, Layers, Tag } from 'lucide-react';
import type { Product, Category, CreateProductRequest, StockAlert } from '../../types/product.types';
import toast from 'react-hot-toast';

type Tab = 'products' | 'categories' | 'stockAlerts';

export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('products');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showPriceModal, setShowPriceModal] = useState<Product | null>(null);
  const [showStockModal, setShowStockModal] = useState<Product | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search],
    queryFn: () => productsApi.getAll({ page, pageSize: 20, search: search || undefined }).then(r => r.data.data),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => productsApi.getCategories().then(r => r.data.data) });
  const { data: stockAlerts } = useQuery({ queryKey: ['stock-alerts'], queryFn: () => productsApi.getStockAlerts().then(r => r.data.data), enabled: tab === 'stockAlerts' });

  const createMut = useMutation({ mutationFn: (d: CreateProductRequest) => productsApi.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setShowForm(false); toast.success('Product created'); }, onError: () => toast.error('Failed to create product') });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductRequest> }) => productsApi.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setEditProduct(null); setShowForm(false); toast.success('Product updated'); }, onError: () => toast.error('Failed to update product') });
  const deleteMut = useMutation({ mutationFn: (id: string) => productsApi.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product deleted'); } });
  const priceMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: { sellingPrice: number; costPrice?: number } }) => productsApi.updatePrice(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setShowPriceModal(null); toast.success('Price updated'); } });
  const stockMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: { quantityChange: number; reason: string } }) => productsApi.adjustStock(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); queryClient.invalidateQueries({ queryKey: ['stock-alerts'] }); setShowStockModal(null); toast.success('Stock adjusted'); } });
  const availabilityMut = useMutation({ mutationFn: ({ id, availability }: { id: string; availability: string }) => productsApi.updateAvailability(id, { availability }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Availability updated'); } });
  const categoryMut = useMutation({ mutationFn: (d: { name: string; description?: string }) => productsApi.createCategory(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setShowCategoryForm(false); toast.success('Category created'); } });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Products</h1><p className="text-slate-500 text-sm mt-1">Manage your product catalog</p></div>
        <div className="flex gap-2">
          {tab === 'categories' && <button onClick={() => setShowCategoryForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition"><Plus className="w-4 h-4" /> Add Category</button>}
          <button onClick={() => { setEditProduct(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"><Plus className="w-4 h-4" /> Add Product</button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['products', 'Products', Package], ['categories', 'Categories', Layers], ['stockAlerts', 'Stock Alerts', AlertTriangle]] as [Tab, string, typeof Package][]).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'products' && (<>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search products by name or SKU..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          {isLoading ? <div className="p-12 text-center text-slate-500">Loading products...</div> : !data?.items?.length ? <div className="p-12 text-center"><Package className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No products found</p></div> : (<>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50/80 border-b border-slate-200/80">
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Product</th>
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">SKU</th>
              <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Stock</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Cost</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Price</th>
              <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
              <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              {data.items.map((product: Product) => (
                <tr key={product.id} className="hover:bg-slate-50/60 transition-all group">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center ring-1 ring-slate-200/60"><Package className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" /></div><div><p className="font-medium text-slate-900">{product.name}</p><p className="text-xs text-slate-500">{product.brand || product.categoryName || 'No brand'}</p></div></div></td>
                  <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{product.sku}</td>
                  <td className="px-5 py-3.5 text-center"><button onClick={() => setShowStockModal(product)} className={`font-medium text-sm px-2 py-0.5 rounded-lg hover:opacity-80 ${product.stockQuantity <= 10 ? 'text-red-600 bg-red-50' : product.stockQuantity <= 50 ? 'text-amber-600 bg-amber-50' : 'text-slate-700 bg-slate-50'}`}>{product.stockQuantity}</button></td>
                  <td className="px-5 py-3.5 text-right text-slate-600">{formatCurrency(product.costPrice)}</td>
                  <td className="px-5 py-3.5 text-right"><button onClick={() => setShowPriceModal(product)} className="font-semibold text-slate-900 hover:text-indigo-600 transition">{formatCurrency(product.sellingPrice)}</button></td>
                  <td className="px-5 py-3.5 text-center"><select value={product.availability} onChange={e => availabilityMut.mutate({ id: product.id, availability: e.target.value })} className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer ${statusColor(product.availability)}`}><option value="InStock">In Stock</option><option value="OutOfStock">Out of Stock</option><option value="LowStock">Low Stock</option></select></td>
                  <td className="px-5 py-3.5 text-center"><div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditProduct(product); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm('Delete this product?')) deleteMut.mutate(product.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"><Trash2 className="w-4 h-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody></table></div>
            {data.totalPages > 1 && <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200/80"><p className="text-sm text-slate-500">Page {data.page} of {data.totalPages} ({data.totalCount} products)</p><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition text-slate-700">Previous</button><button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition text-slate-700">Next</button></div></div>}
          </>)}
        </div>
      </>)}

      {tab === 'categories' && <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">{!categories?.length ? <div className="p-12 text-center"><Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No categories</p></div> : <div className="divide-y divide-slate-100">{categories.map((cat: Category) => (<div key={cat.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center"><Tag className="w-5 h-5 text-indigo-500" /></div><div><p className="font-medium text-slate-900">{cat.name}</p><p className="text-xs text-slate-500">{cat.description || 'No description'} {cat.productCount !== undefined && `• ${cat.productCount} products`}</p></div></div><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{cat.isActive ? 'Active' : 'Inactive'}</span></div>))}</div>}</div>}

      {tab === 'stockAlerts' && <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">{!stockAlerts?.length ? <div className="p-12 text-center"><AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No stock alerts</p></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50/80 border-b border-slate-200/80"><th className="text-left px-5 py-3 font-semibold text-slate-600 text-xs uppercase">Product</th><th className="text-left px-5 py-3 font-semibold text-slate-600 text-xs uppercase">SKU</th><th className="text-center px-5 py-3 font-semibold text-slate-600 text-xs uppercase">Current Stock</th><th className="text-center px-5 py-3 font-semibold text-slate-600 text-xs uppercase">Reorder Level</th><th className="text-center px-5 py-3 font-semibold text-slate-600 text-xs uppercase">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{stockAlerts.map((a: StockAlert) => (<tr key={a.productId} className="hover:bg-red-50/30"><td className="px-5 py-3 font-medium text-slate-900">{a.productName}</td><td className="px-5 py-3 text-slate-600 font-mono text-xs">{a.sku}</td><td className="px-5 py-3 text-center font-bold text-red-600">{a.currentStock}</td><td className="px-5 py-3 text-center text-slate-600">{a.reorderLevel}</td><td className="px-5 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(a.availability)}`}>{a.availability}</span></td></tr>))}</tbody></table></div>}</div>}

      {showForm && <ProductFormModal product={editProduct} categories={categories || []} onClose={() => { setShowForm(false); setEditProduct(null); }} onSubmit={d => editProduct ? updateMut.mutate({ id: editProduct.id, data: d }) : createMut.mutate(d as CreateProductRequest)} isPending={createMut.isPending || updateMut.isPending} />}
      {showPriceModal && <PriceModal product={showPriceModal} onClose={() => setShowPriceModal(null)} onSubmit={d => priceMut.mutate({ id: showPriceModal.id, data: d })} isPending={priceMut.isPending} />}
      {showStockModal && <StockModal product={showStockModal} onClose={() => setShowStockModal(null)} onSubmit={d => stockMut.mutate({ id: showStockModal.id, data: d })} isPending={stockMut.isPending} />}
      {showCategoryForm && <CategoryFormModal onClose={() => setShowCategoryForm(false)} onSubmit={d => categoryMut.mutate(d)} isPending={categoryMut.isPending} />}
    </div>
  );
}

function ProductFormModal({ product, categories, onClose, onSubmit, isPending }: { product: Product | null; categories: Category[]; onClose: () => void; onSubmit: (d: Partial<CreateProductRequest>) => void; isPending: boolean }) {
  const [form, setForm] = useState({ name: product?.name || '', description: product?.description || '', sku: product?.sku || '', barcode: product?.barcode || '', categoryId: product?.categoryId || '', brand: product?.brand || '', costPrice: product?.costPrice?.toString() || '', sellingPrice: product?.sellingPrice?.toString() || '', taxRate: product?.taxRate?.toString() || '0', unit: product?.unit || 'Piece', unitsPerCase: product?.unitsPerCase?.toString() || '1', imageUrl: product?.imageUrl || '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ name: form.name, description: form.description || undefined, sku: form.sku, barcode: form.barcode || undefined, categoryId: form.categoryId, brand: form.brand || undefined, costPrice: parseFloat(form.costPrice), sellingPrice: parseFloat(form.sellingPrice), taxRate: parseFloat(form.taxRate) || 0, unit: form.unit, unitsPerCase: parseInt(form.unitsPerCase) || 1, imageUrl: form.imageUrl || undefined }); };
  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold text-slate-900">{product ? 'Edit Product' : 'New Product'}</h2><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label><input required value={form.sku} onChange={e => set('sku', e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Brand</label><input value={form.brand} onChange={e => set('brand', e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Category *</label><select required value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={inputCls + ' bg-white'}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Cost Price *</label><input required type="number" step="0.01" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Selling Price *</label><input required type="number" step="0.01" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Unit</label><select value={form.unit} onChange={e => set('unit', e.target.value)} className={inputCls + ' bg-white'}>{['Piece','Kg','Liter','Box','Case','Pack','Bottle','Dozen'].map(u => <option key={u}>{u}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Units Per Case</label><input type="number" value={form.unitsPerCase} onChange={e => set('unitsPerCase', e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label><input type="number" step="0.01" value={form.taxRate} onChange={e => set('taxRate', e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label><input value={form.barcode} onChange={e => set('barcode', e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} className={inputCls + ' resize-none'} /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label><input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} className={inputCls} placeholder="https://..." /></div>
        <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Saving...' : product ? 'Update' : 'Create'}</button></div>
      </form>
    </div></div>
  );
}

function PriceModal({ product, onClose, onSubmit, isPending }: { product: Product; onClose: () => void; onSubmit: (d: { sellingPrice: number; costPrice?: number }) => void; isPending: boolean }) {
  const [sp, setSp] = useState(product.sellingPrice.toString());
  const [cp, setCp] = useState(product.costPrice.toString());
  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Update Price</h2><p className="text-sm text-slate-500 mb-4">{product.name} ({product.sku})</p>
      <div className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Selling Price</label><input type="number" step="0.01" value={sp} onChange={e => setSp(e.target.value)} className={inputCls} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label><input type="number" step="0.01" value={cp} onChange={e => setCp(e.target.value)} className={inputCls} /></div></div>
      <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit({ sellingPrice: parseFloat(sp), costPrice: parseFloat(cp) })} disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Saving...' : 'Update Price'}</button></div>
    </div></div>
  );
}

function StockModal({ product, onClose, onSubmit, isPending }: { product: Product; onClose: () => void; onSubmit: (d: { quantityChange: number; reason: string }) => void; isPending: boolean }) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Adjust Stock</h2><p className="text-sm text-slate-500 mb-4">{product.name} — Current: <span className="font-bold">{product.stockQuantity}</span></p>
      <div className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Quantity Change (+ or -)</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} className={inputCls} placeholder="e.g. 50 or -10" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label><input value={reason} onChange={e => setReason(e.target.value)} className={inputCls} placeholder="e.g. New shipment" /></div></div>
      <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit({ quantityChange: parseInt(qty), reason })} disabled={isPending || !qty || !reason} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Saving...' : 'Adjust Stock'}</button></div>
    </div></div>
  );
}

function CategoryFormModal({ onClose, onSubmit, isPending }: { onClose: () => void; onSubmit: (d: { name: string; description?: string }) => void; isPending: boolean }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4">New Category</h2>
      <div className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} className={inputCls + ' resize-none'} /></div></div>
      <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit({ name, description: desc || undefined })} disabled={isPending || !name} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Creating...' : 'Create'}</button></div>
    </div></div>
  );
}
