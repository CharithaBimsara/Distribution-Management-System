import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ShoppingCart, Plus, Package } from 'lucide-react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/common/StatusBadge';
import type { Order, OrderStatus } from '../../types/order.types';
import toast from 'react-hot-toast';

const STATUS_PILLS = ['', 'Pending', 'Approved', 'Processing', 'Dispatched', 'Delivered'];

export default function RepOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [selected, setSelected] = useState<Order | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();

  const { data, isLoading } = useQuery({
    queryKey: ['rep-orders', page, status],
    queryFn: () => ordersApi.repGetAll({ page, pageSize: 20, status: status || undefined as OrderStatus | undefined }).then(r => r.data.data),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersApi.repCancel(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rep-orders'] }); setSelected(null); toast.success('Order cancelled'); },
    onError: () => toast.error('Failed to cancel order'),
  });

  const orders = data?.items || [];
  const totalPages = data?.totalPages || (data ? Math.ceil(data.totalCount / data.pageSize) : 0);

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber', header: 'Order #',
      render: (o) => <span className="font-semibold text-slate-800">{o.orderNumber}</span>,
    },
    { key: 'customerName', header: 'Customer', render: (o) => o.customerName || '—' },
    { key: 'orderDate', header: 'Date', render: (o) => <span className="text-sm text-slate-500">{formatDate(o.orderDate)}</span> },
    { key: 'totalAmount', header: 'Total', align: 'right' as const, render: (o) => <span className="font-semibold">{formatCurrency(o.totalAmount)}</span> },
    { key: 'items', header: 'Items', align: 'center' as const, render: (o) => o.items?.length || 0 },
    { key: 'status', header: 'Status', align: 'center' as const, render: (o) => <StatusBadge status={o.status} type="orders" /> },
  ];

  const handleRowClick = (o: Order) => {
    if (isDesktop) navigate(`/rep/orders/${o.id}`);
    else setSelected(o);
  };

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="My Orders" subtitle="Orders placed for customers"
        actions={[{ label: 'New Order', onClick: () => navigate('/rep/orders/new'), icon: Plus, variant: 'primary' as const }]} />

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_PILLS.map(s => (
          <button key={s} onClick={() => { setStatus(s as OrderStatus | ''); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              status === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}>{s || 'All'}</button>
        ))}
      </div>

      {isDesktop ? (
        <DataTable columns={columns} data={orders} isLoading={isLoading} keyExtractor={(o) => o.id}
          onRowClick={handleRowClick} emptyIcon={<ShoppingCart className="w-12 h-12 text-slate-300" />}
          emptyTitle="No orders found" emptyDescription="Try changing the filter"
          page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : (
        <MobileTileList data={orders} isLoading={isLoading} keyExtractor={(o) => o.id}
          onTileClick={handleRowClick} page={page} totalPages={totalPages} onPageChange={setPage}
          renderTile={(o) => (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-800">{o.orderNumber}</span>
                <StatusBadge status={o.status} type="orders" />
              </div>
              <p className="text-sm text-slate-600">{o.customerName}</p>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-[11px] text-slate-400">{formatDate(o.orderDate)}</span>
                <span className="text-sm font-bold text-slate-800">{formatCurrency(o.totalAmount)}</span>
              </div>
            </div>
          )}
        />
      )}

      {/* Order Detail BottomSheet (mobile) */}
      <BottomSheet isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.orderNumber || 'Order'}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Date</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDate(selected.orderDate)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Status</p>
                <div className="mt-1"><StatusBadge status={selected.status} type="orders" /></div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Items</h3>
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
                {selected.items?.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-indigo-400" /></div>
                      <div><span className="text-sm text-slate-700">{item.productName}</span><span className="text-xs text-slate-400 ml-1">x{item.quantity}</span></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 flex justify-between items-center">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-lg font-bold text-indigo-600">{formatCurrency(selected.totalAmount)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { navigate(`/rep/orders/${selected.id}`); setSelected(null); }}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                View Full Details
              </button>
              {(selected.status === 'Pending' || selected.status === 'Approved') && (
                <button onClick={() => { const reason = prompt('Cancellation reason:'); if (reason) cancelMut.mutate({ id: selected.id, reason }); }}
                  disabled={cancelMut.isPending}
                  className="px-4 py-2.5 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                  {cancelMut.isPending ? '...' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
