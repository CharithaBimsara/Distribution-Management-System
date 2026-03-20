import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { customerCreateQuotation } from '../../services/api/quotationApi';
import { productsApi } from '../../services/api/productsApi';
import { customersApi } from '../../services/api/customersApi';
import { calculateLine } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import type { Product } from '../../types/product.types';
import toast from 'react-hot-toast';

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

  const { data: products } = useQuery({
    queryKey: ['customer-products-for-quotation-create'],
    queryFn: () => productsApi.getAll({ page: 1, pageSize: 500 }).then((r) => r.data.data.items),
  });

  const { data: customerProfile } = useQuery({
    queryKey: ['customer-profile-for-quotation-create'],
    queryFn: () => customersApi.customerGetProfile().then((r) => r.data.data),
  });
  const isNonTaxCustomer = ((customerProfile?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax');

  const createMut = useMutation({
    mutationFn: () =>
      customerCreateQuotation({
        customerId: user?.id || '',
        notes: notes || undefined,
        items: quotationRows
          .filter((r) => !!r.product)
          .map((r) => {
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

  const addQuotationRow = () => {
    setQuotationRows((prev) => [...prev, { id: crypto.randomUUID(), qty: 1 }]);
  };

  const updateQuotationRow = (rowId: string, updates: Partial<QuotationRow>) => {
    setQuotationRows((prev) => {
      if (updates.product) {
        const duplicateExists = prev.some((r) => r.id !== rowId && r.product?.id === updates.product?.id);
        if (duplicateExists) {
          toast.error('This product is already selected in another row');
          return prev;
        }
      }
      const next = prev.map((r) => (r.id === rowId ? { ...r, ...updates } : r));
      const isLast = next[next.length - 1]?.id === rowId;
      if (isLast && updates.product) {
        next.push({ id: crypto.randomUUID(), qty: 1 });
      }
      return next;
    });
  };

  const removeQuotationRow = (rowId: string) => {
    setQuotationRows((prev) => {
      const filtered = prev.filter((r) => r.id !== rowId);
      if (filtered.length === 0) return [{ id: crypto.randomUUID(), qty: 1 }];
      return filtered;
    });
  };

  const getCalcInput = (product: Product) => {
    const isSpecialPrice = product.discountPercent == null && (product.discountAmount || 0) > 0;
    const baseRate = (product.sellingPrice || 0) + (product.discountAmount || 0);
    const rate = isSpecialPrice ? (product.sellingPrice || 0) : baseRate;
    const discountPercent = isSpecialPrice ? 0 : (product.discountPercent ?? 0);
    const taxAmount = isNonTaxCustomer ? 0 : (product.taxAmount ?? 0);
    return { rate, discountPercent, taxAmount };
  };

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6 pb-20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Request Quotation</h1>
          <p className="text-sm text-slate-500 mt-1">Select items using the same table method and enter request price</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-auto text-[11px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="text-left px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Description</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Item</th>
              <th className="text-center px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Qty</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Rate</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">MRP</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Disc %</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Disc Amt</th>
              {!isNonTaxCustomer && <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Tax</th>}
              {!isNonTaxCustomer && <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Tax Amt</th>}
              <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Amount</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Request Price</th>
              <th className="text-center px-2 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotationRows.map((row) => {
              const p = row.product;
              const selectedProductIds = new Set(
                quotationRows
                  .filter((r) => r.id !== row.id && r.product)
                  .map((r) => r.product!.id)
              );
              const calcInput = p ? getCalcInput(p) : null;
              const amount = p
                ? calculateLine({
                    rate: calcInput!.rate,
                    qty: row.qty,
                    discountPercent: calcInput!.discountPercent,
                    taxAmount: calcInput!.taxAmount,
                  }).total
                : 0;
              const discountAmount = p ? ((calcInput!.rate * row.qty) * (calcInput!.discountPercent / 100)) : 0;

              return (
                <tr key={row.id} className="odd:bg-white even:bg-slate-50/50">
                  <td className="px-2 py-1.5 min-w-[260px]">
                    <select
                      value={p?.id || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const product = ((products || []) as Product[]).find((item) => item.id === selectedId);
                        if (!product) return;
                        updateQuotationRow(row.id, { product });
                      }}
                      className="w-full border border-slate-300 rounded-md px-2 py-1 bg-white text-[11px]"
                    >
                      <option value="">Select product</option>
                      {((products || []) as Product[]).map((option) => (
                        <option key={option.id} value={option.id} disabled={selectedProductIds.has(option.id)}>
                          {option.name} ({option.sku})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1.5 text-slate-600 font-mono text-[10px] whitespace-nowrap">{p?.sku || ''}</td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      min={1}
                      value={row.qty}
                      disabled={!p}
                      onChange={(e) => updateQuotationRow(row.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-14 text-center text-[11px] border border-slate-300 rounded-md px-1 py-0.5"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? formatCurrency(calcInput!.rate) : ''}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{p?.mrp != null ? formatCurrency(p.mrp) : ''}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? calcInput!.discountPercent : ''}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? formatCurrency(discountAmount) : ''}</td>
                  {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right whitespace-nowrap">{p?.taxCode || ''}</td>}
                  {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? formatCurrency((calcInput!.taxAmount || 0) * row.qty) : ''}</td>}
                  <td className="px-3 py-1.5 text-right font-semibold whitespace-nowrap">{p ? formatCurrency(amount) : ''}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.requestPrice ?? ''}
                      disabled={!p}
                      onChange={(e) => updateQuotationRow(row.id, { requestPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-24 text-right text-[11px] border border-slate-300 rounded-md px-2 py-0.5"
                      placeholder="optional"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => removeQuotationRow(row.id)} className="text-red-500 hover:text-red-700 text-[11px]">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button onClick={addQuotationRow} className="w-full py-2 text-xs font-semibold border border-dashed border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition">
        + Add Row
      </button>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add notes..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none resize-none" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => navigate('/shop/quotations')} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
          Cancel
        </button>
        <button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || quotationRows.filter((r) => !!r.product).length === 0}
          className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {createMut.isPending ? 'Submitting...' : 'Send Quotation'}
        </button>
      </div>
    </div>
  );
}
