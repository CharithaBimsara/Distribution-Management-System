import { Fragment, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { downloadPurchaseOrderPdf } from '../../utils/purchaseOrderPdf';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import MobileTileList from '../../components/common/MobileTileList';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import BottomSheet from '../../components/common/BottomSheet';
import { ClipboardList, Package, Star, Loader2, Search, X, ChevronRight, ShoppingCart } from 'lucide-react';
import type { Order, OrderStatus } from '../../types/order.types';
import toast from 'react-hot-toast';

const STATUS_FILTERS: { label: string; value: OrderStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Processing', value: 'Processing' },
  { label: 'Dispatched', value: 'Dispatched' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Cancelled', value: 'Cancelled' },
];

export default function CustomerOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [ratingVal, setRatingVal] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  const desktop = useIsDesktop();
  const navigate = useNavigate();

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
      toast.success('Reorder placed');
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
      setExpandedOrderId(null);
    },
    onError: () => toast.error('Cancel failed'),
  });

  const rateMut = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment?: string }) =>
      ordersApi.customerRate(id, { rating, comment }),
    onSuccess: () => {
      toast.success('Thanks for your rating');
      refetch();
      setSelectedOrder(null);
      setRatingVal(0);
      setRatingComment('');
    },
    onError: () => toast.error('Rating failed'),
  });

  const orders = data?.items || [];
  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
      }),
    [orders, search]
  );

  const totalPages = data?.totalPages || 0;
  const hasActiveFilters = !!(status || search);

  const handleRowClick = (order: Order) => {
    if (!desktop) {
      setSelectedOrder(order);
      return;
    }
    setExpandedOrderId((prev) => (prev === order.id ? null : order.id));
  };

  const handleCancelOrder = (order: Order) => {
    if (order.status !== 'Pending') {
      toast.error('Only pending orders can be cancelled');
      return;
    }
    cancelMut.mutate(order.id);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-28">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
            <p className="text-slate-500 text-sm mt-1">Manage and track your orders</p>
          </div>
          <button
            onClick={() => navigate('/shop/products')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Create Order
          </button>
        </div>
      </div>

      <div className="sticky top-14 md:top-16 z-20">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.10)] px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 min-w-[180px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="text"
                placeholder="Search order #"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none transition-all"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderStatus | '');
                setPage(1);
              }}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/15 focus:border-orange-300 transition cursor-pointer"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.label} value={f.value}>{f.label}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => { setSearch(''); setStatus(''); setPage(1); }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        {desktop ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading orders</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-14 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No orders found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-8" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Placed By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <Fragment key={order.id}>
                      <tr
                        onClick={() => handleRowClick(order)}
                        className={`border-b border-slate-50 cursor-pointer transition-colors ${
                          expandedOrderId === order.id ? 'bg-orange-50/60 border-orange-100' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-3 py-3.5 w-8">
                          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-90 text-orange-500' : ''}`} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-900 text-sm">{order.orderNumber}</span>
                            {order.isFromApprovedQuotation && (
                              <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Approved Quotation
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">{order.repName ? order.repName : 'Customer (Direct)'}</td>
                        <td className="px-4 py-3.5 text-sm text-slate-500">{formatDate(order.orderDate)}</td>
                        <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-4 py-3.5 text-center text-sm text-slate-500">{order.items?.length || 0}</td>
                        <td className="px-4 py-3.5 text-center"><StatusBadge status={order.status} /></td>
                      </tr>

                      {expandedOrderId === order.id && (
                        <tr className="border-b border-orange-100">
                          <td colSpan={7} className="p-0">
                            <div className="bg-gradient-to-b from-orange-50/80 to-slate-50/20 px-6 py-4" style={{ animation: 'fadeIn 0.18s ease-out both' }}>
                              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-semibold text-slate-700">{order.orderNumber}</span>
                                  <span className="text-slate-500">{formatDate(order.orderDate)}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => downloadPurchaseOrderPdf(order)}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition"
                                  >
                                    Download PDF
                                  </button>
                                  {order.status === 'Pending' && (
                                    <button
                                      onClick={() => handleCancelOrder(order)}
                                      className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition"
                                    >
                                      Cancel Order
                                    </button>
                                  )}
                                </div>
                              </div>

                              {order.items?.length ? (
                                <div className="rounded-xl overflow-hidden border border-orange-100/80 mb-4">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-slate-100/80">
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {order.items.map((item, i) => (
                                        <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                          <td className="px-4 py-2.5 text-center text-xs text-slate-400 font-medium">{i + 1}</td>
                                          <td className="px-4 py-2.5 font-medium text-slate-900">{item.productName}</td>
                                          <td className="px-4 py-2.5 text-center text-slate-700">{item.quantity}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                                          <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : null}

                              <div className="flex justify-end">
                                <div className="w-60 space-y-1.5 text-sm bg-white border border-slate-100 rounded-xl p-4">
                                  <div className="flex justify-between text-slate-500">
                                    <span>Subtotal</span><span>{formatCurrency(order.subTotal)}</span>
                                  </div>
                                  {order.discountAmount > 0 && (
                                    <div className="flex justify-between text-slate-500">
                                      <span>Discount</span><span className="text-emerald-600">{formatCurrency(order.discountAmount)}</span>
                                    </div>
                                  )}
                                  {order.taxAmount > 0 && (
                                    <div className="flex justify-between text-slate-500">
                                      <span>Tax</span><span>{formatCurrency(order.taxAmount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-base pt-2.5 border-t border-slate-200 text-orange-700">
                                    <span>Total</span><span>{formatCurrency(order.totalAmount)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}

            {data && data.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">{data.totalCount} total • page {data.page} of {data.totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
                  <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <MobileTileList
            data={filteredOrders}
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
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                    {order.isFromApprovedQuotation && (
                      <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Approved Quotation
                      </span>
                    )}
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{formatDate(order.orderDate)} • {order.items?.length || 0} items</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
                  {order.status === 'Pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelOrder(order); }}
                      className="flex-1 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50 transition"
                    >
                      Cancel
                    </button>
                  )}
                  {order.status === 'Delivered' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); reorderMut.mutate(order.id); }}
                      className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-semibold hover:bg-orange-100 transition"
                    >
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        )}

      </div>

      <BottomSheet open={!!selectedOrder && !desktop} onClose={() => setSelectedOrder(null)} title={selectedOrder?.orderNumber || 'Order Detail'}>
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Date</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDate(selectedOrder.orderDate)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Status</p>
                <div className="mt-1"><StatusBadge status={selectedOrder.status} /></div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Items</h3>
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-orange-400" /></div>
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

            <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-lg font-bold text-orange-600">{formatCurrency(selectedOrder.totalAmount)}</span>
            </div>

            {selectedOrder.status === 'Pending' && (
              <button
                onClick={() => handleCancelOrder(selectedOrder)}
                className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all"
              >
                Cancel Order
              </button>
            )}

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
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
