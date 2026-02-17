import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency } from '../../utils/formatters';
import { orderDraftUtils } from '../../utils/orderDraft';
import { ArrowLeft, User, Package, ShoppingCart, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function RepCreateOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState(orderDraftUtils.get());
  const [deliveryAddress, setDeliveryAddress] = useState(draft.deliveryAddress || '');
  const [deliveryNotes, setDeliveryNotes] = useState(draft.deliveryNotes || '');

  // Refresh draft from sessionStorage on mount and when navigating back
  useEffect(() => {
    const refreshDraft = () => setDraft(orderDraftUtils.get());
    window.addEventListener('focus', refreshDraft);
    refreshDraft();
    return () => window.removeEventListener('focus', refreshDraft);
  }, []);

  // Save delivery info to draft
  useEffect(() => {
    orderDraftUtils.setDeliveryInfo(deliveryAddress, deliveryNotes);
  }, [deliveryAddress, deliveryNotes]);

  // Fetch selected customer details
  const { data: selectedCustomer } = useQuery({
    queryKey: ['rep-customer', draft.customerId],
    queryFn: () => customersApi.repGetById(draft.customerId!).then(r => r.data.data),
    enabled: !!draft.customerId,
  });

  // Create order mutation
  const createMut = useMutation({
    mutationFn: (d: { customerId: string; deliveryAddress?: string; deliveryNotes?: string; items: { productId: string; quantity: number }[] }) => ordersApi.repCreate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rep-orders'] });
      orderDraftUtils.clear();
      toast.success('Order created successfully!');
      navigate('/rep/orders');
    },
    onError: () => toast.error('Failed to create order'),
  });

  const handleSubmit = () => {
    if (!draft.customerId) return toast.error('Please select a customer');
    if (draft.items.length === 0) return toast.error('Add at least one product');
    createMut.mutate({
      customerId: draft.customerId,
      deliveryAddress: deliveryAddress || undefined,
      deliveryNotes: deliveryNotes || undefined,
      items: draft.items.map(({ productId, quantity }) => ({ productId, quantity }))
    });
  };

  const total = orderDraftUtils.getTotal();
  const itemCount = orderDraftUtils.getItemCount();
  const exceedsCredit = selectedCustomer && (selectedCustomer.currentBalance + total > selectedCustomer.creditLimit);

  return (
    <div className="animate-fade-in pb-16">
      <div className="px-4 lg:px-6 pt-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { orderDraftUtils.clear(); navigate(-1); }} className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Order</h1>
            <p className="text-sm text-slate-500 mt-0.5">Select customer → Add products → Place order</p>
          </div>
        </div>

        {/* Customer Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Customer</h2>
            </div>
            {draft.customerId && (
              <button onClick={() => navigate('/rep/orders/new/customers')} className="text-sm text-emerald-600 hover:underline">
                Change
              </button>
            )}
          </div>

          {!draft.customerId ? (
            <button onClick={() => navigate('/rep/orders/new/customers')} className="w-full py-12 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 transition group">
              <User className="w-12 h-12 mx-auto text-slate-400 group-hover:text-emerald-600 mb-3" />
              <div className="text-lg font-semibold text-slate-700 group-hover:text-emerald-600">Select Customer</div>
              <div className="text-sm text-slate-500 mt-1">Tap to choose from your customers</div>
            </button>
          ) : (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <div className="text-lg font-bold text-slate-900">{draft.customerName}</div>
              {selectedCustomer && (
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-slate-600">Current Balance</div>
                    <div className="font-semibold text-slate-900">{formatCurrency(selectedCustomer.currentBalance)}</div>
                  </div>
                  <div>
                    <div className="text-slate-600">Credit Limit</div>
                    <div className="font-semibold text-slate-900">{formatCurrency(selectedCustomer.creditLimit)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-slate-600">Location</div>
                    <div className="font-semibold text-slate-900">{selectedCustomer.city}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Products</h2>
              {draft.items.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {draft.items.length === 0 ? (
            <button onClick={() => navigate('/rep/orders/new/products')} className="w-full py-12 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 transition group">
              <Package className="w-12 h-12 mx-auto text-slate-400 group-hover:text-emerald-600 mb-3" />
              <div className="text-lg font-semibold text-slate-700 group-hover:text-emerald-600">Add Products</div>
              <div className="text-sm text-slate-500 mt-1">Browse catalog and add items to cart</div>
            </button>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {draft.items.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.sku} • {formatCurrency(item.price)}/{item.unit}</div>
                    </div>
                    <div className="text-sm text-slate-600">{item.quantity} × {formatCurrency(item.price)}</div>
                    <div className="text-sm font-bold text-slate-900 w-24 text-right">{formatCurrency(item.price * item.quantity)}</div>
                    <button onClick={() => { orderDraftUtils.removeItem(item.productId); setDraft(orderDraftUtils.get()); }} className="p-1.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/rep/orders/new/products')} className="w-full py-3 border-2 border-emerald-600 text-emerald-600 font-semibold rounded-xl hover:bg-emerald-50 transition">
                + Add More Products
              </button>
            </>
          )}
        </div>

        {/* Delivery Info */}
        {draft.customerId && draft.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Delivery Information (Optional)</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Delivery Address</label>
                <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-emerald-500" placeholder="Enter delivery address..." />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Delivery Notes</label>
                <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-emerald-500 resize-none" rows={2} placeholder="Special instructions..." />
              </div>
            </div>
          </div>
        )}

        {/* Order Summary & Place Order */}
        {draft.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-slate-700">Order Total</span>
              <span className="text-2xl font-bold text-emerald-600">{formatCurrency(total)}</span>
            </div>

            {exceedsCredit && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                ⚠️ Warning: This order will exceed customer's credit limit
              </div>
            )}

            <button disabled={!draft.customerId || draft.items.length === 0 || createMut.isPending} onClick={handleSubmit} className="w-full py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {createMut.isPending ? 'Placing Order...' : `Place Order — ${formatCurrency(total)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
