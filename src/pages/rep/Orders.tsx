import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { productsApi } from '../../services/api/productsApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { ShoppingCart, Package, X, Plus, Trash2, XCircle } from 'lucide-react';
import type { Order, CreateOrderItemRequest } from '../../types/order.types';
import type { Product } from '../../types/product.types';
import toast from 'react-hot-toast';

export default function RepOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['rep-orders', page, status],
    queryFn: () => ordersApi.repGetAll({ page, pageSize: 20, status: status || undefined }).then(r => r.data.data),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersApi.repCancel(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rep-orders'] }); setSelectedOrder(null); toast.success('Order cancelled'); },
    onError: () => toast.error('Failed to cancel order'),
  });

  const createMut = useMutation({
    mutationFn: (d: { customerId: string; deliveryAddress?: string; deliveryNotes?: string; items: CreateOrderItemRequest[] }) => ordersApi.repCreate(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rep-orders'] }); setShowCreateOrder(false); toast.success('Order created!'); },
    onError: () => toast.error('Failed to create order'),
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 pt-5 pb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="flex items-center justify-between">
          <div><h1 className="text-white text-xl font-bold">My Orders</h1><p className="text-emerald-200 text-sm mt-0.5">Orders placed for customers</p></div>
          <button onClick={() => setShowCreateOrder(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm font-semibold hover:bg-white/30 transition active:scale-95"><Plus className="w-4 h-4" /> New Order</button>
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-3 pb-6">
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['', 'Pending', 'Approved', 'Processing', 'Dispatched', 'Delivered'].map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${status === s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>{s || 'All'}</button>
          ))}
        </div>

        {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div> : !data?.items?.length ? (
          <div className="text-center py-16"><div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><ShoppingCart className="w-8 h-8 text-slate-300" /></div><p className="text-slate-500 font-medium">No orders found</p><p className="text-xs text-slate-400 mt-1">Try changing the filter</p></div>
        ) : (
          <div className="space-y-2.5">
            {data.items.map((order: Order) => (
              <div key={order.id} onClick={() => setSelectedOrder(order)} className="card p-4 active:scale-[0.98] cursor-pointer transition-all">
                <div className="flex items-center justify-between mb-2"><span className="text-sm font-bold text-slate-800">{order.orderNumber}</span><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>{order.status}</span></div>
                <p className="text-sm text-slate-600">{order.customerName}</p>
                <div className="flex items-center justify-between mt-2.5"><span className="text-[11px] text-slate-400">{formatDate(order.orderDate)}</span><span className="text-sm font-bold text-slate-800">{formatCurrency(order.totalAmount)}</span></div>
              </div>
            ))}
            {data.totalPages > 1 && <div className="flex items-center justify-between pt-2"><span className="text-xs text-slate-400">Page {page} of {data.totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl disabled:opacity-40 active:scale-95 transition">Prev</button><button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl disabled:opacity-40 active:scale-95 transition">Next</button></div></div>}
          </div>
        )}
      </div>

      {/* Order Detail Bottom Sheet */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50"><div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} /><div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up pb-safe">
          <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100"><div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" /><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Order {selectedOrder.orderNumber}</h2><p className="text-sm text-slate-400">{selectedOrder.customerName}</p></div><button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 rounded-xl transition"><X className="w-5 h-5 text-slate-400" /></button></div></div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-400 font-medium">Date</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{formatDate(selectedOrder.orderDate)}</p></div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-400 font-medium">Status</p><span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${statusColor(selectedOrder.status)}`}>{selectedOrder.status}</span></div>
            </div>
            <div><h3 className="font-semibold text-slate-800 text-sm mb-3">Items</h3><div className="space-y-2.5">{selectedOrder.items?.map(item => (
              <div key={item.id} className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0"><Package className="w-4 h-4 text-slate-400" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p><p className="text-[11px] text-slate-400">Qty: {item.quantity}</p></div><span className="text-sm font-bold text-slate-800">{formatCurrency(item.lineTotal)}</span></div>
            ))}</div></div>
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center"><span className="font-bold text-slate-800">Total</span><span className="text-lg font-bold text-emerald-600">{formatCurrency(selectedOrder.totalAmount)}</span></div>
            {(selectedOrder.status === 'Pending' || selectedOrder.status === 'Approved') && (
              <button onClick={() => { const reason = prompt('Cancellation reason:'); if (reason) cancelMut.mutate({ id: selectedOrder.id, reason }); }} disabled={cancelMut.isPending} className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition active:scale-95">
                <XCircle className="w-4 h-4" /> {cancelMut.isPending ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div></div>
      )}

      {/* Create Order Modal */}
      {showCreateOrder && <CreateOrderSheet onClose={() => setShowCreateOrder(false)} onSubmit={d => createMut.mutate(d)} isPending={createMut.isPending} />}
    </div>
  );
}

function CreateOrderSheet({ onClose, onSubmit, isPending }: { onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<(CreateOrderItemRequest & { name: string; price: number })[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const { data: customers } = useQuery({ queryKey: ['rep-customers-lookup', customerSearch], queryFn: () => customersApi.repGetCustomers({ search: customerSearch, pageSize: 10 }).then(r => r.data.data), enabled: customerSearch.length > 1 });
  const { data: products } = useQuery({ queryKey: ['rep-products-lookup', productSearch], queryFn: () => productsApi.getAll({ search: productSearch, pageSize: 10 }).then(r => r.data.data), enabled: productSearch.length > 1 });

  const addProduct = (p: Product) => {
    if (items.find(i => i.productId === p.id)) return;
    setItems([...items, { productId: p.id, quantity: 1, name: p.name, price: p.sellingPrice }]);
    setProductSearch('');
  };
  const removeItem = (pid: string) => setItems(items.filter(i => i.productId !== pid));
  const updateQty = (pid: string, qty: number) => setItems(items.map(i => i.productId === pid ? { ...i, quantity: qty } : i));
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const cls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none';

  return (
    <div className="fixed inset-0 z-50"><div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} /><div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up pb-safe">
      <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10"><div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" /><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900 text-lg">Create Order</h2><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button></div></div>
      <div className="p-6 space-y-5">
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Customer *</label>
          <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className={cls} placeholder="Search customers..." />
          {customers && (customers as any).items?.length > 0 && !customerId && (
            <div className="border border-slate-200 rounded-lg mt-1 max-h-32 overflow-y-auto divide-y divide-slate-100">{(customers as any).items.map((c: any) => (
              <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerSearch(c.shopName || c.contactPerson); }} className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition">{c.shopName || c.contactPerson} — {c.city}</button>
            ))}</div>
          )}
          {customerId && <p className="text-xs text-emerald-600 mt-1 font-medium">Customer selected</p>}
        </div>

        {/* Product Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Add Products</label>
          <input value={productSearch} onChange={e => setProductSearch(e.target.value)} className={cls} placeholder="Search products..." />
          {products && (products as any).items?.length > 0 && (
            <div className="border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100">{(products as any).items.map((p: Product) => (
              <button key={p.id} onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition flex justify-between"><span>{p.name} ({p.sku})</span><span className="font-medium">{formatCurrency(p.sellingPrice)}</span></button>
            ))}</div>
          )}
        </div>

        {/* Selected Items */}
        {items.length > 0 && (<div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Order Items</h3>
          <div className="space-y-2">{items.map(item => (
            <div key={item.productId} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{item.name}</p><p className="text-xs text-slate-500">{formatCurrency(item.price)} each</p></div>
              <input type="number" min="1" value={item.quantity} onChange={e => updateQty(item.productId, parseInt(e.target.value) || 1)} className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center" />
              <span className="text-sm font-bold w-20 text-right">{formatCurrency(item.price * item.quantity)}</span>
              <button onClick={() => removeItem(item.productId)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}</div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200"><span className="font-bold text-slate-800">Estimated Total</span><span className="text-lg font-bold text-emerald-600">{formatCurrency(total)}</span></div>
        </div>)}

        {/* Delivery Info */}
        <div><label className="block text-sm font-semibold text-slate-700 mb-2">Delivery Address</label><input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className={cls} placeholder="Optional delivery address" /></div>
        <div><label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label><textarea rows={2} value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className={cls + ' resize-none'} placeholder="Optional notes" /></div>

        {/* Submit */}
        <button onClick={() => onSubmit({ customerId, deliveryAddress: deliveryAddress || undefined, deliveryNotes: deliveryNotes || undefined, items: items.map(({ productId, quantity }) => ({ productId, quantity })) })} disabled={isPending || !customerId || items.length === 0} className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 active:scale-95">
          {isPending ? 'Creating...' : `Place Order — ${formatCurrency(total)}`}
        </button>
      </div>
    </div></div>
  );
}
