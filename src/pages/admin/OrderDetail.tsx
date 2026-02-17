import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { ArrowLeft, Package, XCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEffect, useRef, useState } from 'react';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [statusPicker, setStatusPicker] = useState('');

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (window.innerWidth >= 1024) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });
  }, [id]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => ordersApi.adminGetById(id || '').then(r => r.data.data),
    enabled: !!id,
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) => ordersApi.adminUpdateStatus(orderId, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); qc.invalidateQueries({ queryKey: ['admin-order', id] }); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update status'),
  });

  const rejectMut = useMutation({
    mutationFn: (orderId: string) => ordersApi.adminReject(orderId, 'Rejected by admin'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Order rejected'); navigate('/admin/orders'); },
    onError: () => toast.error('Failed to reject'),
  });

  useEffect(() => {
    if (data) setStatusPicker(data.status || '');
  }, [data]);

  if (isLoading) return (
    <div className="p-6">
      <div className="skeleton h-8 w-48 mb-4" />
      <div className="skeleton h-64" />
    </div>
  );

  if (error || !data) return (
    <div className="p-6">
      <div className="text-center text-slate-500">Unable to load order</div>
    </div>
  );

  const order = data;

  return (
    <div ref={rootRef} className="max-w-3xl mx-auto p-6 animate-fade-in slide-in-right-desktop">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate('/admin/orders')} className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">{order.orderNumber}</h1>
          <p className="text-xs text-slate-400">{formatDate(order.orderDate)}</p>
        </div>
        <div className="ml-auto text-right">
          <div className={`inline-block text-[11px] px-2.5 py-1 rounded-full font-semibold ${statusColor(order.status)}`}>{order.status}</div>
        </div>
      </div>

      <div className="space-y-4">
        <section className="bg-white rounded-2xl border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Items</h3>
          <div className="divide-y divide-slate-100">
            {order.items?.map(item => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Package className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{item.productName}</div>
                    <div className="text-xs text-slate-400">x{item.quantity}</div>
                  </div>
                </div>
                <div className="font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
          <span className="font-bold text-slate-900">Total</span>
          <span className="text-xl font-bold text-emerald-600">{formatCurrency(order.totalAmount)}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <h4 className="text-sm font-semibold mb-2">Change status</h4>
          <div className="flex gap-3 items-center">
            <select value={statusPicker} onChange={e => setStatusPicker(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">Select status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Processing</option>
              <option>Dispatched</option>
              <option>Delivered</option>
              <option>Cancelled</option>
              <option>Rejected</option>
            </select>
            <button onClick={() => { if (!statusPicker) return; updateStatusMut.mutate({ orderId: order.id, status: statusPicker }); }} disabled={!statusPicker || statusPicker === order.status} className="py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">Update</button>
            {order.status === 'Pending' && (
              <button onClick={() => rejectMut.mutate(order.id)} className="py-2.5 px-4 bg-red-600 text-white rounded-lg text-sm flex items-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
