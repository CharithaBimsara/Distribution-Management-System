import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productsApi } from '../../services/api/productsApi';
import type { Product, Category, CreateProductRequest } from '../../types/product.types';
import { X } from 'lucide-react';

export default function ProductEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams(); // id is present when editing
  const isNew = !id;

  const { data: productData, isFetching: loadingProduct } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => productsApi.getById(id as string).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => productsApi.getCategories().then(r => r.data.data) });

  const createMut = useMutation({ mutationFn: (d: CreateProductRequest) => productsApi.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product created'); navigate('/admin/products'); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductRequest> }) => productsApi.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product updated'); navigate('/admin/products'); } });

  const [form, setForm] = useState({
    name: '', description: '', sku: '', barcode: '', categoryId: '', brand: '', costPrice: '', sellingPrice: '', taxRate: '0', unit: 'Piece', unitsPerCase: '1', imageUrl: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!productData) return;
    setForm({
      name: productData.name || '',
      description: productData.description || '',
      sku: productData.sku || '',
      barcode: productData.barcode || '',
      categoryId: productData.categoryId || '',
      brand: productData.brand || '',
      costPrice: productData.costPrice?.toString() || '',
      sellingPrice: productData.sellingPrice?.toString() || '',
      taxRate: productData.taxRate?.toString() || '0',
      unit: productData.unit || 'Piece',
      unitsPerCase: productData.unitsPerCase?.toString() || '1',
      imageUrl: productData.imageUrl || '',
    });
  }, [productData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<CreateProductRequest> = {
      name: form.name,
      description: form.description || undefined,
      sku: form.sku,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId,
      brand: form.brand || undefined,
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      taxRate: parseFloat(form.taxRate) || 0,
      unit: form.unit,
      unitsPerCase: parseInt(form.unitsPerCase) || 1,
      imageUrl: form.imageUrl || undefined,
    };

    if (isNew) createMut.mutate(payload as CreateProductRequest);
    else updateMut.mutate({ id: id as string, data: payload });
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isNew ? 'New Product' : 'Edit Product'}</h1>
          <p className="text-sm text-slate-500 mt-1">{isNew ? 'Create a new product' : `Update ${productData?.name || ''}`}</p>
        </div>
        <div>
          <button onClick={() => navigate('/admin/products')} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
              <input required value={form.sku} onChange={e => set('sku', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
              <input value={form.brand} onChange={e => set('brand', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select required value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={inputCls + ' bg-white'}>
                <option value="">Select category</option>
                {(categories || []).map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price *</label>
              <input required type="number" step="0.01" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price *</label>
              <input required type="number" step="0.01" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inputCls + ' bg-white'}>{['Piece','Kg','Liter','Box','Case','Pack','Bottle','Dozen'].map(u => <option key={u}>{u}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Units Per Case</label>
              <input type="number" value={form.unitsPerCase} onChange={e => set('unitsPerCase', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
              <input type="number" step="0.01" value={form.taxRate} onChange={e => set('taxRate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
              <input value={form.barcode} onChange={e => set('barcode', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} className={inputCls + ' resize-none'} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
            <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} className={inputCls} placeholder="https://..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/admin/products')} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{createMut.isPending || updateMut.isPending ? 'Saving...' : isNew ? 'Create' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
