import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';
import OrderDetailView from '../../components/orders/OrderDetailView';

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
    <div ref={rootRef}>
      <OrderDetailView order={order} backPath="/rep/orders" summaryTitle="Rep Order Summary">
        {order.status === 'Pending' && (
          <button onClick={() => cancelMut.mutate(order.id)} className="w-full max-w-sm py-3 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all">
            Cancel Order
          </button>
        )}
      </OrderDetailView>
    </div>
  );
}
