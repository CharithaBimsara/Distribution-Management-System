import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { ArrowLeft, Package, Star, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect, useRef } from 'react';

export default function CustomerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ratingVal, setRatingVal] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  // ensure detail is scrolled into view when opened via route (desktop / split view)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // smooth scroll the detail into view (works for split view and full page)
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // on full-page view also ensure viewport is at top of content area
    if (window.innerWidth >= 1024) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });
  }, [id]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-order', id],
    queryFn: () => ordersApi.customerGetById(id || '').then(r => r.data.data),
    enabled: !!id,
  });

  const cancelMut = useMutation({
    mutationFn: (orderId: string) => ordersApi.customerCancel(orderId, 'Customer cancelled'),
    onSuccess: () => { toast.success('Order cancelled'); qc.invalidateQueries({ queryKey: ['customer-orders'] }); navigate('/shop/orders'); },
    onError: () => toast.error('Cancel failed'),
  });

  const reorderMut = useMutation({
    mutationFn: (orderId: string) => ordersApi.customerReorder(orderId),
    onSuccess: () => { toast.success('Reorder placed'); qc.invalidateQueries({ queryKey: ['customer-orders'] }); navigate('/shop/orders'); },
    onError: () => toast.error('Reorder failed'),
  });

  const rateMut = useMutation({
    mutationFn: ({ orderId, rating, comment }: { orderId: string; rating: number; comment?: string }) =>
      ordersApi.customerRate(orderId, { rating, comment }),
    onSuccess: () => { toast.success('Thanks for your rating'); qc.invalidateQueries({ queryKey: ['customer-orders'] }); },
    onError: () => toast.error('Rating failed'),
  });

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
    <div className="max-w-3xl mx-auto p-6 animate-fade-in slide-in-right-desktop">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate('/shop/orders')} className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition">
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
                    <Package className="w-4 h-4 text-orange-400" />
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

        <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-rose-50 rounded-xl p-4">
          <span className="font-bold text-slate-900">Total</span>
          <span className="text-xl font-bold text-orange-600">{formatCurrency(order.totalAmount)}</span>
        </div>

        {order.status === 'Pending' && (
          <button
            onClick={() => cancelMut.mutate(order.id)}
            className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all"
          >
            Cancel Order
          </button>
        )}

        {order.status === 'Delivered' && !order.rating && (
          <div className="bg-amber-50/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-slate-900 text-sm">Rate this order</h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRatingVal(star)} className="p-0.5">
                  <Star className={`w-7 h-7 ${star <= ratingVal ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>
            <textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} rows={3} placeholder="How was your experience? (optional)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => rateMut.mutate({ orderId: order.id, rating: ratingVal, comment: ratingComment || undefined })} disabled={ratingVal === 0 || rateMut.isPending} className="flex-1 lg:flex-none lg:w-auto py-2.5 bg-amber-500 text-white rounded-xl font-semibold disabled:opacity-40">{rateMut.isPending ? 'Submitting...' : 'Submit Rating'}</button>
              <button onClick={() => reorderMut.mutate(order.id)} disabled={reorderMut.isPending} className="hidden lg:inline-flex py-2.5 px-4 bg-white border border-slate-200 rounded-xl font-semibold">Reorder</button>
            </div>
          </div>
        )}

        {order.rating && (
          <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3">
            <span className="text-xs text-slate-500 font-medium">Your Rating:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className={`w-4 h-4 ${star <= (order.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
              ))}
            </div>
          </div>
        )}

        {order.status === 'Delivered' && (
          <button onClick={() => reorderMut.mutate(order.id)} disabled={reorderMut.isPending} className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg lg:hidden">{reorderMut.isPending ? 'Reordering...' : 'Reorder'}</button>
        )}
      </div>
    </div>
  );
}
