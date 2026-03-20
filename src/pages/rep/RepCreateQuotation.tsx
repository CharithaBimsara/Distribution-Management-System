import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { repCreateQuotation } from '../../services/api/quotationApi';
import { customersApi } from '../../services/api/customersApi';
import { productsApi } from '../../services/api/productsApi';
import { calculateLine } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import type { Product } from '../../types/product.types';
import toast from 'react-hot-toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { ArrowLeft, User, Package, ShoppingCart, Trash2 } from 'lucide-react';

type QuotationRow = {
  id: string;
  product?: Product;
  qty: number;
  requestPrice?: number;
};

export default function RepCreateQuotation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [quotationRows, setQuotationRows] = useState<QuotationRow[]>([{ id: crypto.randomUUID(), qty: 1 }]);

  const { data: customers } = useQuery({
    queryKey: ['rep-customers-for-quotation-create'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 500 }).then((r) => r.data.data.items),
  });

  const { data: products } = useQuery({
    queryKey: ['rep-products-for-quotation-create'],
    queryFn: () => productsApi.getAll({ page: 1, pageSize: 500 }).then((r) => r.data.data.items),
  });

  const selectedCustomerName = useMemo(() => {
    const customer = (customers || []).find((c: any) => c.id === selectedCustomerId);
    return customer?.shopName || '';
  }, [customers, selectedCustomerId]);
  const selectedCustomer = useMemo(() => {
    return (customers || []).find((c: any) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);
  const isNonTaxCustomer = ((selectedCustomer?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax');

  const createMut = useMutation({
    mutationFn: () =>
      repCreateQuotation({
        customerId: selectedCustomerId,
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
      toast.success('Quotation submitted! It is now visible to coordinator and admin.');
      queryClient.invalidateQueries({ queryKey: ['rep-quotations'] });
      navigate('/rep/quotations');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      toast.error(msg || 'Failed to submit quotation');
    },
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

  const selectedItems = quotationRows.filter((r) => !!r.product);
  const quotationTotal = selectedItems.reduce((sum, row) => {
    const p = row.product as Product;
    const calcInput = getCalcInput(p);
    const calc = calculateLine({
      rate: calcInput.rate,
      qty: row.qty,
      discountPercent: calcInput.discountPercent,
      taxAmount: calcInput.taxAmount,
    });
    return sum + calc.total;
  }, 0);

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6 pb-20">
      {isDesktop ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create Quotation</h1>
              <p className="text-sm text-slate-500 mt-1">Create quotations for your customer using the same item table format</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full md:max-w-md px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
            >
              <option value="">Select customer</option>
              {(customers || []).map((customer: any) => (
                <option key={customer.id} value={customer.id}>{customer.shopName}</option>
              ))}
            </select>
            {selectedCustomerName && (
              <p className="text-xs text-slate-400 mt-2">Selected: {selectedCustomerName}</p>
            )}
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
                    ? calculateLine({ rate: calcInput!.rate, qty: row.qty, discountPercent: calcInput!.discountPercent, taxAmount: calcInput!.taxAmount }).total
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
                        <input type="number" min={1} value={row.qty} disabled={!p} onChange={(e) => updateQuotationRow(row.id, { qty: Math.max(1, Number(e.target.value) || 1) })} className="w-14 text-center text-[11px] border border-slate-300 rounded-md px-1 py-0.5" />
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? formatCurrency(calcInput!.rate) : ''}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{p?.mrp != null ? formatCurrency(p.mrp) : ''}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? calcInput!.discountPercent : ''}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? formatCurrency(discountAmount) : ''}</td>
                      {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right whitespace-nowrap">{p?.taxCode || ''}</td>}
                      {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? formatCurrency((calcInput!.taxAmount || 0) * row.qty) : ''}</td>}
                      <td className="px-3 py-1.5 text-right font-semibold whitespace-nowrap">{p ? formatCurrency(amount) : ''}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} step={0.01} value={row.requestPrice ?? ''} disabled={!p} onChange={(e) => updateQuotationRow(row.id, { requestPrice: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-24 text-right text-[11px] border border-slate-300 rounded-md px-2 py-0.5" placeholder="optional" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => removeQuotationRow(row.id)} className="text-red-500 hover:text-red-700 text-[11px]">x</button>
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
            <button onClick={() => navigate('/rep/quotations')} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button onClick={() => createMut.mutate()} disabled={createMut.isPending || !selectedCustomerId || selectedItems.length === 0} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {createMut.isPending ? 'Submitting...' : 'Send Quotation'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create Quotation</h1>
              <p className="text-sm text-slate-500 mt-1">Select customer, add products, and submit</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><User className="w-5 h-5 text-emerald-700" /></div>
              <h2 className="text-lg font-bold text-slate-900">Customer</h2>
            </div>
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm">
              <option value="">Select customer</option>
              {(customers || []).map((customer: any) => (
                <option key={customer.id} value={customer.id}>{customer.shopName}</option>
              ))}
            </select>
            {selectedCustomerName && <p className="text-xs text-slate-500 mt-2">Selected: {selectedCustomerName}</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Package className="w-5 h-5 text-emerald-700" /></div>
              <h2 className="text-lg font-bold text-slate-900">Products</h2>
            </div>
            <div className="space-y-3">
              {quotationRows.map((row) => {
                const p = row.product;
                const selectedProductIds = new Set(quotationRows.filter((r) => r.id !== row.id && r.product).map((r) => r.product!.id));
                const calcInput = p ? getCalcInput(p) : null;
                const amount = p ? calculateLine({ rate: calcInput!.rate, qty: row.qty, discountPercent: calcInput!.discountPercent, taxAmount: calcInput!.taxAmount }).total : 0;
                return (
                  <div key={row.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50/70">
                    <select
                      value={p?.id || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const product = ((products || []) as Product[]).find((item) => item.id === selectedId);
                        if (!product) return;
                        updateQuotationRow(row.id, { product });
                      }}
                      className="w-full border border-slate-300 rounded-lg px-2 py-2 bg-white text-sm mb-2"
                    >
                      <option value="">Select product</option>
                      {((products || []) as Product[]).map((option) => (
                        <option key={option.id} value={option.id} disabled={selectedProductIds.has(option.id)}>
                          {option.name} ({option.sku})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" min={1} value={row.qty} disabled={!p} onChange={(e) => updateQuotationRow(row.id, { qty: Math.max(1, Number(e.target.value) || 1) })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Qty" />
                      <input type="number" min={0} step={0.01} value={row.requestPrice ?? ''} disabled={!p} onChange={(e) => updateQuotationRow(row.id, { requestPrice: e.target.value === '' ? undefined : Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Request" />
                      <button onClick={() => removeQuotationRow(row.id)} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm inline-flex items-center justify-center gap-1">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                    {p && <p className="text-xs text-slate-500 mt-2">{p.sku} • Amount: <span className="font-semibold text-slate-800">{formatCurrency(amount)}</span></p>}
                  </div>
                );
              })}
            </div>
            <button onClick={addQuotationRow} className="w-full mt-3 py-2.5 text-sm font-semibold border border-dashed border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition">+ Add Product</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add notes..." className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm resize-none" />
          </div>

          <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+70px)] z-40 px-3 md:px-4">
            <div className="max-w-3xl mx-auto bg-gradient-to-r from-emerald-600 to-green-600 border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 flex items-center gap-3 text-white">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">{selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}</p>
                <p className="text-base font-bold text-white truncate">{formatCurrency(quotationTotal)}</p>
              </div>
              <button onClick={() => createMut.mutate()} disabled={createMut.isPending || !selectedCustomerId || selectedItems.length === 0} className="px-5 py-3 rounded-xl bg-white text-emerald-700 text-sm font-bold disabled:opacity-60">
                {createMut.isPending ? 'Submitting...' : 'Send'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
