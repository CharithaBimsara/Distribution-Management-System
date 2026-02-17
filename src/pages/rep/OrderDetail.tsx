import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { ArrowLeft, Package, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

export default function RepOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (window.innerWidth >= 1024) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });
  }, [id]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-order', id],
    queryFn: () => ordersApi.repGetById(id || '').then(r => r.data.data),
    enabled: !!id,
  });

  const cancelMut = useMutation({
    mutationFn: (orderId: string) => ordersApi.repCancel(orderId, 'Rep cancelled'),
    onSuccess: () => { toast.success('Order cancelled'); qc.invalidateQueries({ queryKey: ['rep-orders'] }); navigate('/rep/orders'); },
    onError: () => toast.error('Cancel failed'),
  });

  if (isLoading) return <div className="p-6">
    <div className="skeleton h-8 w-48 mb-4" />
    <div className="skeleton h-64" />
  </div>;

  if (error || !data) return <div className="p-6"> <div className="text-center text-slate-500">Unable to load order</div> </div>;

  const order = data;

  return (
    <div ref={rootRef} className="max-w-3xl mx-auto p-6 animate-fade-in slide-in-right-desktop">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate('/rep/orders')} className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition">
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

        {order.status === 'Pending' && (
          <button onClick={() => cancelMut.mutate(order.id)} className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all">
            Cancel Order
          </button>
        )}
      </div>

    </div>
  );
}
