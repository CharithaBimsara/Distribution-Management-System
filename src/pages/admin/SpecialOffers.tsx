import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import { offersApi } from '../../services/api/offersApi';
import { productsApi } from '../../services/api/productsApi';
import type { SpecialOffer } from '../../types/offer.types';
import type { Product } from '../../types/product.types';

export default function AdminSpecialOffers() {
  const qc = useQueryClient();

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['special-offers-admin'],
    queryFn: () => offersApi.adminGetAll().then(r => r.data.data || []),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['special-offer-products-dropdown'],
    queryFn: () => productsApi.getAll({ page: 1, pageSize: 500, sortBy: 'name', sortDir: 'asc' }).then(r => r.data.data),
  });

  const products = useMemo(() => productsData?.items || [], [productsData]);

  const [form, setForm] = useState({ productName: '', offerBrief: '', isActive: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (data: any) => offersApi.adminCreate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['special-offers-admin'] });
      qc.invalidateQueries({ queryKey: ['special-offers-public'] });
      setForm({ productName: '', offerBrief: '', isActive: true });
      toast.success('Special offer created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create offer'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => offersApi.adminUpdate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['special-offers-admin'] });
      qc.invalidateQueries({ queryKey: ['special-offers-public'] });
      setEditingId(null);
      setForm({ productName: '', offerBrief: '', isActive: true });
      toast.success('Special offer updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update offer'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => offersApi.adminDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['special-offers-admin'] });
      qc.invalidateQueries({ queryKey: ['special-offers-public'] });
      toast.success('Special offer deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete offer'),
  });

  const handleSave = () => {
    if (!form.productName.trim() || !form.offerBrief.trim()) {
      toast.error('Please select product and enter offer brief');
      return;
    }

    const payload = {
      productName: form.productName.trim(),
      offerBrief: form.offerBrief.trim(),
      isActive: form.isActive,
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload });
      return;
    }

    createMut.mutate(payload);
  };

  const startEdit = (offer: SpecialOffer) => {
    setEditingId(offer.id);
    setForm({ productName: offer.productName, offerBrief: offer.offerBrief, isActive: offer.isActive });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ productName: '', offerBrief: '', isActive: true });
  };

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300';

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="Special Offers" subtitle="Create and manage customer-facing special offers" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="p-2.5 bg-rose-50 rounded-xl"><Gift className="w-5 h-5 text-rose-600" /></span>
            <h2 className="font-semibold text-slate-900">{editingId ? 'Update Offer' : 'Create Offer'}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Product</label>
              <select
                value={form.productName}
                onChange={(e) => setForm(p => ({ ...p, productName: e.target.value }))}
                className={inputCls}
                disabled={productsLoading}
              >
                <option value="">{productsLoading ? 'Loading products...' : 'Select a product'}</option>
                {products.map((product: Product) => (
                  <option key={product.id} value={product.name}>{product.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Offer Brief</label>
              <textarea
                rows={3}
                value={form.offerBrief}
                onChange={(e) => setForm(p => ({ ...p, offerBrief: e.target.value }))}
                className={inputCls + ' resize-none'}
                placeholder="Ex: Buy 2 and get Rs.200 off this week"
              />
            </div>

            <label className="flex items-center justify-between py-1">
              <span className="text-sm text-slate-700">Active on customer banner</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500/20"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? 'Update Offer' : 'Create Offer'}
              </button>

              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="p-2.5 bg-amber-50 rounded-xl"><Sparkles className="w-5 h-5 text-amber-600" /></span>
            <h2 className="font-semibold text-slate-900">Current Offers ({offers.length})</h2>
          </div>

          {offersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 skeleton" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {offers.length === 0 && (
                <div className="text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 text-center">
                  No special offers yet
                </div>
              )}

              {offers.map((offer: SpecialOffer) => (
                <div key={offer.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{offer.productName}</p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{offer.offerBrief}</p>
                      <span className={`inline-flex mt-2 px-2 py-0.5 text-[11px] rounded-full font-medium ${offer.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(offer)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title="Edit offer">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMut.mutate(offer.id)}
                        disabled={deleteMut.isPending}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 disabled:opacity-50"
                        title="Delete offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}