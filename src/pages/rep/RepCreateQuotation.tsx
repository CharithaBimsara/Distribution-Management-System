import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { repCreateQuotation } from '../../services/api/quotationApi';
import { customersApi } from '../../services/api/customersApi';
import { productsApi } from '../../services/api/productsApi';
import { formatCurrency } from '../../utils/formatters';
import type { Product } from '../../types/product.types';
import toast from 'react-hot-toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { ArrowLeft, User, Package, Trash2, FileText, Plus } from 'lucide-react';
import ProductDropdown from '../../components/common/ProductDropdown';

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
  const [rowSearches, setRowSearches] = useState<Record<string, string>>({});

  const { data: customers } = useQuery({
    queryKey: ['rep-customers-for-quotation-create'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 500 }).then((r) => r.data.data.items),
  });

  const { data: products } = useQuery({
    queryKey: ['rep-products-for-quotation-create'],
    queryFn: () => productsApi.getAllForSelection(),
  });

  const selectedCustomerName = useMemo(() => {
    const customer = (customers || []).find((c: any) => c.id === selectedCustomerId);
    return customer?.shopName || '';
  }, [customers, selectedCustomerId]);

  const { data: selectedCustomerDetail } = useQuery({
    queryKey: ['rep-customer', selectedCustomerId],
    queryFn: () => customersApi.repGetById(selectedCustomerId!).then(r => r.data.data),
    enabled: !!selectedCustomerId,
  });
  const isNonTaxCustomer = ((selectedCustomerDetail?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax');

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
    const taxAmount = product.taxAmount ?? 0;
    return { rate, discountPercent, taxAmount, isSpecialPrice };
  };

  const selectedItems = quotationRows.filter((r) => !!r.product);

  const quotationTotalGross = selectedItems.reduce((sum, row) => {
    const p = row.product as Product;
    const pricing = getCalcInput(p);
    const baseAmount = pricing.rate * row.qty;
    const rowTax = (p.taxAmount || 0) * row.qty;
    return sum + (isNonTaxCustomer ? (baseAmount + rowTax) : baseAmount);
  }, 0);

  const quotationTotalTax = selectedItems.reduce((sum, row) => {
    const p = row.product as Product;
    const tax = isNonTaxCustomer ? 0 : (p.taxAmount || 0);
    return sum + tax * row.qty;
  }, 0);

  const quotationTotalDiscount = selectedItems.reduce((sum, row) => {
    const p = row.product as Product;
    const pricing = getCalcInput(p);
    const unitDisc = pricing.isSpecialPrice ? 0 : (p.discountAmount || 0);
    return sum + unitDisc * row.qty;
  }, 0);

  const quotationTotal = isNonTaxCustomer
    ? quotationTotalGross - quotationTotalDiscount
    : quotationTotalGross + quotationTotalTax - quotationTotalDiscount;

  /* ═══════ DESKTOP ═══════ */
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Create Quotation</h1>
                <p className="text-sm text-slate-500">Create quotations for your customer</p>
              </div>
            </div>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">{selectedItems.length} items</span>
                <span className="text-emerald-300">|</span>
                <span className="text-sm font-bold text-emerald-700">{formatCurrency(quotationTotal)}</span>
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Customer</h2>
                  {selectedCustomerName && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedCustomerName}
                      {isNonTaxCustomer && <span className="text-orange-600 font-semibold"> &bull; Non-Tax</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5">
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full max-w-lg px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition">
                <option value="">Select a customer...</option>
                {(customers || []).map((customer: any) => (
                  <option key={customer.id} value={customer.id}>{customer.shopName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Quotation Items</h2>
              </div>
              <button onClick={addQuotationRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition">
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider min-w-[280px]">Product</th>
                    <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">SKU</th>
                    <th className="text-center px-3 py-3 font-semibold text-[10px] uppercase tracking-wider w-20">Qty</th>
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Rate</th>
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">MRP</th>
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Disc %</th>
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Disc Amt</th>
                    {!isNonTaxCustomer && <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Tax</th>}
                    {!isNonTaxCustomer && <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Tax Amt</th>}
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Amount</th>
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Request Price</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotationRows.map((row) => {
                    const p = row.product;
                    const selectedProductIds = new Set(quotationRows.filter((r) => r.id !== row.id && r.product).map((r) => r.product!.id));
                    const calcInput = p ? getCalcInput(p) : null;
                    let grossAmount = 0, discAmt = 0, taxAmt = 0;
                    if (p && calcInput) {
                      taxAmt = p.taxAmount || 0;
                      discAmt = calcInput.isSpecialPrice ? 0 : (p.discountAmount || 0);
                      const baseAmount = calcInput.rate * row.qty;
                      const rowTax = taxAmt * row.qty;
                      grossAmount = isNonTaxCustomer ? (baseAmount + rowTax) : baseAmount;
                    }
                    return (
                      <tr key={row.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 min-w-[280px]">
                          <ProductDropdown rowId={row.id}
                            value={rowSearches[row.id] !== undefined ? rowSearches[row.id] : (p?.name || '')}
                            products={(products || []) as Product[]} selectedProductIds={selectedProductIds} currentProductId={p?.id}
                            onChange={(val) => { setRowSearches(prev => ({ ...prev, [row.id]: val })); if (!val.trim()) updateQuotationRow(row.id, { product: undefined }); }}
                            onSelect={(product) => { updateQuotationRow(row.id, { product }); setRowSearches(prev => ({ ...prev, [row.id]: product.name })); }}
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[10px] whitespace-nowrap">{p?.sku || ''}</td>
                        <td className="px-2 py-2 text-center">
                          <input type="number" min={1} value={row.qty} disabled={!p}
                            onChange={(e) => updateQuotationRow(row.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-16 text-center text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition disabled:opacity-40" />
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">{p && calcInput ? formatCurrency(isNonTaxCustomer ? calcInput.rate + taxAmt : calcInput.rate) : ''}</td>
                        <td className="px-3 py-2 text-right text-slate-400 whitespace-nowrap">{p?.mrp != null ? formatCurrency(p.mrp) : ''}</td>
                        <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{p && calcInput && calcInput.discountPercent > 0 ? `${calcInput.discountPercent}%` : ''}</td>
                        <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{p && discAmt > 0 ? formatCurrency(discAmt) : ''}</td>
                        {!isNonTaxCustomer && <td className="px-3 py-2 text-right text-slate-400 whitespace-nowrap">{p?.taxCode || ''}</td>}
                        {!isNonTaxCustomer && <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{p && taxAmt > 0 ? formatCurrency(taxAmt) : ''}</td>}
                        <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">{p ? formatCurrency(grossAmount) : ''}</td>
                        <td className="px-2 py-2">
                          <input type="number" min={0} step={0.01} value={row.requestPrice ?? ''} disabled={!p}
                            onChange={(e) => updateQuotationRow(row.id, { requestPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                            className="w-24 text-right text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition disabled:opacity-40" placeholder="optional" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeQuotationRow(row.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Notes</h2>
                  <p className="text-xs text-slate-400">Optional</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add notes for this quotation..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none placeholder-slate-400 transition" />
            </div>
          </div>

          {/* Summary & Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Gross Amount</span>
                <span className="font-semibold text-slate-700">{formatCurrency(quotationTotalGross)}</span>
              </div>
              {!isNonTaxCustomer && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tax</span>
                  <span className="font-semibold text-slate-700">+{formatCurrency(quotationTotalTax)}</span>
                </div>
              )}
              {quotationTotalDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">-{formatCurrency(quotationTotalDiscount)}</span>
                </div>
              )}
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-900">Estimated Total</span>
                <span className="text-2xl font-bold text-emerald-600">{formatCurrency(quotationTotal)}</span>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => navigate('/rep/quotations')}
                className="flex-1 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !selectedCustomerId || selectedItems.length === 0}
                className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                <FileText className="w-4 h-4" />
                {createMut.isPending ? 'Submitting...' : 'Send Quotation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ MOBILE / TABLET ═══════ */
  return (
    <div className="pb-28">
      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Create Quotation</h1>
            <p className="text-xs text-slate-500">Select customer, add products, and submit</p>
          </div>
        </div>

        {/* Customer Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-slate-900">Customer</span>
              {isNonTaxCustomer && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Non-Tax</span>}
            </div>
          </div>
          <div className="p-4">
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
              <option value="">Select customer...</option>
              {(customers || []).map((customer: any) => (
                <option key={customer.id} value={customer.id}>{customer.shopName}</option>
              ))}
            </select>
            {selectedCustomerName && <p className="text-xs text-slate-500 mt-2">Selected: {selectedCustomerName}</p>}
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-sm font-bold text-slate-900">Products</span>
              {selectedItems.length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">{selectedItems.length}</span>
              )}
            </div>
          </div>
          <div className="p-4 space-y-3">
            {quotationRows.map((row) => {
              const p = row.product;
              const selectedProductIds = new Set(quotationRows.filter((r) => r.id !== row.id && r.product).map((r) => r.product!.id));
              const calcInput = p ? getCalcInput(p) : null;
              let grossAmount = 0;
              if (p && calcInput) {
                const baseAmount = calcInput.rate * row.qty;
                const rowTax = (p.taxAmount || 0) * row.qty;
                grossAmount = isNonTaxCustomer ? (baseAmount + rowTax) : baseAmount;
              }
              return (
                <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">
                  <ProductDropdown rowId={row.id}
                    value={rowSearches[row.id] !== undefined ? rowSearches[row.id] : (p?.name || '')}
                    products={(products || []) as Product[]} selectedProductIds={selectedProductIds} currentProductId={p?.id}
                    onChange={(val) => { setRowSearches(prev => ({ ...prev, [row.id]: val })); if (!val.trim()) updateQuotationRow(row.id, { product: undefined }); }}
                    onSelect={(product) => { updateQuotationRow(row.id, { product }); setRowSearches(prev => ({ ...prev, [row.id]: product.name })); }}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Qty</label>
                      <input type="number" min={1} value={row.qty} disabled={!p}
                        onChange={(e) => updateQuotationRow(row.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center disabled:opacity-40" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Request</label>
                      <input type="number" min={0} step={0.01} value={row.requestPrice ?? ''} disabled={!p}
                        onChange={(e) => updateQuotationRow(row.id, { requestPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right disabled:opacity-40" placeholder="Opt." />
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => removeQuotationRow(row.id)}
                        className="w-full py-2 border border-red-200 text-red-500 rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-red-50 transition">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  {p && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <span>{p.sku}</span>
                      <span className="font-bold text-slate-800">{formatCurrency(grossAmount)}</span>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addQuotationRow}
              className="w-full py-2.5 border border-dashed border-emerald-300 text-emerald-600 font-semibold rounded-xl text-xs hover:bg-emerald-50 transition">
              + Add Product
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900">Notes</span>
                <span className="text-xs text-slate-400 ml-2">Optional</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add notes..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>
        </div>

        {/* Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Gross Amount</span><span className="font-semibold text-slate-700">{formatCurrency(quotationTotalGross)}</span>
            </div>
            {!isNonTaxCustomer && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax</span><span className="font-semibold text-slate-700">+{formatCurrency(quotationTotalTax)}</span>
              </div>
            )}
            {quotationTotalDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span><span className="font-semibold">-{formatCurrency(quotationTotalDiscount)}</span>
              </div>
            )}
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900">Estimated Total</span>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(quotationTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+70px)] z-40 px-3">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !selectedCustomerId || selectedItems.length === 0}
            className="w-full bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/30 p-4 flex items-center gap-3 disabled:opacity-50 active:scale-[0.98] transition">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[10px] font-semibold text-emerald-100 uppercase tracking-wider">{selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}</p>
              <p className="text-base font-bold">{formatCurrency(quotationTotal)}</p>
            </div>
            <span className="px-5 py-2.5 bg-white text-emerald-700 rounded-xl text-sm font-bold shrink-0">
              {createMut.isPending ? 'Sending...' : 'Send'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
