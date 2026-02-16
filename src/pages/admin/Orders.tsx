import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { ShoppingCart, Eye, CheckCircle, XCircle, ChevronDown, X, RefreshCw } from 'lucide-react';
import type { Order } from '../../types/order.types';
import toast from 'react-hot-toast';

const statusOptions = ['', 'Pending', 'Approved', 'Processing', 'Dispatched', 'Delivered', 'Cancelled', 'Rejected'];
const progressStatuses = ['Processing', 'Dispatched', 'Delivered'];

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, status],
    queryFn: () => ordersApi.adminGetAll({ page, pageSize: 20, status: status || undefined }).then(r => r.data.data),
  });

  const approveMut = useMutation({ mutationFn: (id: string) => ordersApi.adminApprove(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); setSelectedOrder(null); toast.success('Order approved'); }, onError: () => toast.error('Failed to approve') });
  const rejectMut = useMutation({ mutationFn: (id: string) => ordersApi.adminReject(id, 'Rejected by admin'), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); setSelectedOrder(null); toast.success('Order rejected'); }, onError: () => toast.error('Failed to reject') });
  const updateStatusMut = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => ordersApi.adminUpdateStatus(id, { status }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Status updated'); }, onError: () => toast.error('Failed to update status') });

  const getNextStatuses = (current: string): string[] => {
    const idx = progressStatuses.indexOf(current);
    if (current === 'Approved') return ['Processing'];
    if (idx >= 0 && idx < progressStatuses.length - 1) return [progressStatuses[idx + 1]];
    return [];
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Orders</h1><p className="text-slate-500 text-sm mt-1">Manage customer orders</p></div>

      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative"><select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="appearance-none pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white">
            <option value="">All Statuses</option>{statusOptions.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        {isLoading ? <div className="p-8 text-center text-slate-500">Loading orders...</div> : !data?.items?.length ? (
          <div className="p-8 text-center"><ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No orders found</p></div>
        ) : (<>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 font-medium text-slate-600">Order #</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
            <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
            <th className="text-center px-4 py-3 font-medium text-slate-600">Items</th>
            <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="text-center px-4 py-3 font-medium text-slate-600">Actions</th>
          </tr></thead><tbody className="divide-y divide-slate-100">
            {data.items.map((order: Order) => (
              <tr key={order.id} className="hover:bg-slate-50/60 transition-all duration-150">
                <td className="px-4 py-3 font-medium text-slate-900">{order.orderNumber}</td>
                <td className="px-4 py-3 text-slate-600">{order.customerName}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(order.orderDate)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(order.totalAmount)}</td>
                <td className="px-4 py-3 text-center text-slate-600">{order.items?.length || 0}</td>
                <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(order.status)}`}>{order.status}</span></td>
                <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1">
                  <button onClick={() => setSelectedOrder(order)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Eye className="w-4 h-4" /></button>
                  {order.status === 'Pending' && (<>
                    <button onClick={() => approveMut.mutate(order.id)} className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => rejectMut.mutate(order.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Reject"><XCircle className="w-4 h-4" /></button>
                  </>)}
                  {getNextStatuses(order.status).map(next => (
                    <button key={next} onClick={() => updateStatusMut.mutate({ id: order.id, status: next })} disabled={updateStatusMut.isPending} className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition" title={`Move to ${next}`}>
                      <RefreshCw className="w-3 h-3" /> {next}
                    </button>
                  ))}
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
          {data.totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200"><p className="text-sm text-slate-500">Page {data.page} of {data.totalPages} ({data.totalCount} orders)</p><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50">Previous</button><button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50">Next</button></div></div>}
        </>)}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={() => setSelectedOrder(null)} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Order {selectedOrder.orderNumber}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{selectedOrder.customerName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{formatDate(selectedOrder.orderDate)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(selectedOrder.status)}`}>{selectedOrder.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Rep</span><span>{selectedOrder.repName || 'N/A'}</span></div>
          </div>
          <hr className="my-4" />
          <h3 className="font-medium text-slate-900 mb-2">Items</h3>
          <div className="space-y-2">{selectedOrder.items?.map(item => (
            <div key={item.id} className="flex justify-between text-sm"><span className="text-slate-600">{item.productName} x {item.quantity}</span><span className="font-medium">{formatCurrency(item.lineTotal)}</span></div>
          ))}</div>
          <hr className="my-4" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(selectedOrder.subTotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatCurrency(selectedOrder.taxAmount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>-{formatCurrency(selectedOrder.discountAmount)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total</span><span>{formatCurrency(selectedOrder.totalAmount)}</span></div>
          </div>
          {/* Status Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            {selectedOrder.status === 'Pending' && (<>
              <button onClick={() => { approveMut.mutate(selectedOrder.id); }} className="flex-1 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium transition">Approve</button>
              <button onClick={() => { rejectMut.mutate(selectedOrder.id); }} className="flex-1 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition">Reject</button>
            </>)}
            {getNextStatuses(selectedOrder.status).map(next => (
              <button key={next} onClick={() => { updateStatusMut.mutate({ id: selectedOrder.id, status: next }); setSelectedOrder(null); }} className="flex-1 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition">Move to {next}</button>
            ))}
          </div>
          <button onClick={() => setSelectedOrder(null)} className="mt-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Close</button>
        </div></div>
      )}
    </div>
  );
}
