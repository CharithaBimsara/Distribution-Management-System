import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import BottomSheet from '../../components/common/BottomSheet';
import { ClipboardList, Package, RotateCcw, Star, Loader2 } from 'lucide-react';
import type { Order, OrderStatus } from '../../types/order.types';
import toast from 'react-hot-toast';

const STATUS_FILTERS: { label: string; value: OrderStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Processing', value: 'Processing' },
  { label: 'Dispatched', value: 'Dispatched' },
  { label: 'Delivered', value: 'Delivered' },
];

export default function CustomerOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [ratingVal, setRatingVal] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const { id: routeOrderId } = useParams();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer-orders', page, status],
    queryFn: () =>
      ordersApi
        .customerGetAll({ page, pageSize: 20, status: status || (undefined as OrderStatus | undefined) })
        .then((r) => r.data.data),
  });

  const reorderMut = useMutation({
    mutationFn: (id: string) => ordersApi.customerReorder(id),
    onSuccess: () => {
      toast.success('Reorder placed!');
      refetch();
    },
    onError: () => toast.error('Reorder failed'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => ordersApi.customerCancel(id, 'Customer cancelled'),
    onSuccess: () => {
      toast.success('Order cancelled');
      refetch();
      setSelectedOrder(null);
    },
  });

  const rateMut = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment?: string }) =>
      ordersApi.customerRate(id, { rating, comment }),
    onSuccess: () => {
      toast.success('Thanks for your rating!');
      refetch();
      setSelectedOrder(null);
      setRatingVal(0);
      setRatingComment('');
    },
    onError: () => toast.error('Rating failed'),
  });

  const orders = data?.items || [];
  const totalPages = data?.totalPages || 0;

  const handleRowClick = (order: Order) => {
    if (desktop) {
      navigate(`/shop/orders/${order.id}`);
    } else {
      setSelectedOrder(order);
    }
  };

  /* ─── Desktop columns ─── */
  const columns: Column<Order>[] = [
    { key: 'orderNumber', header: 'Order #', render: (o) => <span className="font-semibold text-slate-900">{o.orderNumber}</span> },
    {
      key: 'orderDate',
      header: 'Date',
      render: (o) => <span className="text-slate-500">{formatDate(o.orderDate)}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      align: 'center',
      render: (o) => <span className="text-slate-500">{o.items?.length || 0}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'right',
      render: (o) => <span className="font-semibold text-slate-900">{formatCurrency(o.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (o) =>
        o.status === 'Delivered' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              reorderMut.mutate(o.id);
            }}
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reorder
          </button>
        ) : null,
    },
  ];

  /* ─── Wide-screen split view (xl) with Outlet for OrderDetail ─── */
  const showSplitView = desktop && routeOrderId;

  return (
    <div className="animate-fade-in">
      <PageHeader title="My Orders" subtitle="Track and manage your orders" />

      <div className="px-4 lg:px-6 pb-6 space-y-4">
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                status === f.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Split layout for xl when route has :id */}
        <div className={showSplitView ? 'xl:grid xl:grid-cols-[420px_1fr] xl:gap-6' : ''}>
          {/* Orders Data */}
          {desktop ? (
            <DataTable
              data={orders}
              columns={columns}
              keyField="id"
              isLoading={isLoading}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onRowClick={handleRowClick}
              emptyState={<EmptyState icon={ClipboardList} title="No orders found" description="Your orders will appear here" />}
            />
          ) : (
            <MobileTileList
              data={orders}
              keyField="id"
              isLoading={isLoading}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onTileClick={handleRowClick}
              emptyState={<EmptyState icon={ClipboardList} title="No orders found" description="Your orders will appear here" />}
              renderTile={(order) => (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {formatDate(order.orderDate)} &bull; {order.items?.length || 0} items
                    </span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  {order.status === 'Delivered' && (
                    <div className="mt-3 pt-3 border-t border-slate-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderMut.mutate(order.id);
                        }}
                        className="flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-100 active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reorder
                      </button>
                    </div>
                  )}
                </div>
              )}
            />
          )}

          {/* Nested Outlet for desktop split-view */}
          {showSplitView && (
            <div className="hidden xl:block">
              <Outlet />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet — Order Detail */}
      <BottomSheet open={!!selectedOrder && !desktop} onClose={() => setSelectedOrder(null)} title={selectedOrder?.orderNumber || 'Order Detail'}>
        {selectedOrder && (
          <div className="space-y-4">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Date</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDate(selectedOrder.orderDate)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Items</h3>
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <span className="text-sm text-slate-700">{item.productName}</span>
                        <span className="text-xs text-slate-400 ml-1">x{item.quantity}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-indigo-50 rounded-xl p-4 flex justify-between items-center">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-lg font-bold text-indigo-600">{formatCurrency(selectedOrder.totalAmount)}</span>
            </div>

            {/* Cancel */}
            {selectedOrder.status === 'Pending' && (
              <button
                onClick={() => cancelMut.mutate(selectedOrder.id)}
                className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all"
              >
                Cancel Order
              </button>
            )}

            {/* Rating */}
            {selectedOrder.status === 'Delivered' && !selectedOrder.rating && (
              <div className="bg-amber-50/50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 text-sm">Rate this order</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRatingVal(star)} className="p-0.5 transition-transform active:scale-90">
                      <Star className={`w-7 h-7 ${star <= ratingVal ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="How was your experience? (optional)"
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none resize-none transition"
                />
                <button
                  onClick={() => rateMut.mutate({ id: selectedOrder.id, rating: ratingVal, comment: ratingComment || undefined })}
                  disabled={ratingVal === 0 || rateMut.isPending}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {rateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Rating'}
                </button>
              </div>
            )}

            {/* Already rated */}
            {selectedOrder.rating && (
              <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3">
                <span className="text-xs text-slate-500 font-medium">Your Rating:</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= (selectedOrder.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Reorder */}
            {selectedOrder.status === 'Delivered' && (
              <button
                onClick={() => reorderMut.mutate(selectedOrder.id)}
                disabled={reorderMut.isPending}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all hover:bg-indigo-700"
              >
                {reorderMut.isPending ? 'Reordering...' : 'Reorder'}
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
