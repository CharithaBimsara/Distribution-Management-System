import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { ClipboardList, RotateCcw, X, Package, Star, Loader2 } from 'lucide-react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import type { Order } from '../../types/order.types';
import toast from 'react-hot-toast';

export default function CustomerOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [ratingVal, setRatingVal] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const navigate = useNavigate();
  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  const isWide = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer-orders', page, status],
    queryFn: () => ordersApi.customerGetAll({ page, pageSize: 20, status: status || undefined }).then(r => r.data.data),
  });

  const { id: routeOrderId } = useParams();
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  // keep mobile bottom-sheet in sync with route (so direct links work on phones)
  useEffect(() => {
    if (!routeOrderId) return setSelectedOrder(null);
    // if route contains id and we already have it in the list, use it
    const found = data?.items?.find(o => o.id === routeOrderId);
    if (found) {
      setSelectedOrder(found);
      // ensure selected row is visible in the left list
      const row = document.getElementById(`order-${found.id}`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // ensure right detail panel is visible (split view)
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    // otherwise fetch the single order (graceful for direct links)
    (async () => {
      try {
        const res = await ordersApi.customerGetById(routeOrderId);
        setSelectedOrder(res.data.data);
        // if the detail panel exists, bring it into view
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {
        setSelectedOrder(null);
      }
    })();
  }, [routeOrderId, data]);

  // when user selects an order (selectedOrder state) ensure the right panel is visible on wide screens
  useEffect(() => {
    if (!selectedOrder) return;
    const row = document.getElementById(`order-${selectedOrder.id}`);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedOrder]);

  const reorderMut = useMutation({
    mutationFn: (id: string) => ordersApi.customerReorder(id),
    onSuccess: () => { toast.success('Reorder placed!'); refetch(); },
    onError: () => toast.error('Reorder failed'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => ordersApi.customerCancel(id, 'Customer cancelled'),
    onSuccess: () => { toast.success('Order cancelled'); refetch(); navigate('/shop/orders'); },
  });

  const rateMut = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment?: string }) =>
      ordersApi.customerRate(id, { rating, comment }),
    onSuccess: () => { toast.success('Thanks for your rating!'); refetch(); navigate('/shop/orders'); },
    onError: () => toast.error('Rating failed'),
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white px-5 pt-5 pb-10">
        <h1 className="text-xl font-bold">My Orders</h1>
        <p className="text-orange-100 text-sm mt-0.5">Track and manage your orders</p>
      </div>

      <div className="px-4 -mt-5 space-y-4 relative z-10 pb-6">
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['', 'Pending', 'Approved', 'Processing', 'Dispatched', 'Delivered'].map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                status === s
                  ? 'bg-white text-orange-600 shadow-md shadow-orange-500/15'
                  : 'bg-white/80 backdrop-blur-sm text-slate-500 border border-slate-100'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex justify-between mb-3">
                  <div className="h-4 bg-slate-100 rounded-full w-24 skeleton" />
                  <div className="h-5 bg-slate-100 rounded-full w-16 skeleton" />
                </div>
                <div className="flex justify-between">
                  <div className="h-3 bg-slate-100 rounded-full w-32 skeleton" />
                  <div className="h-4 bg-slate-100 rounded-full w-20 skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.items?.length ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
            <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No orders found</p>
            <p className="text-xs text-slate-400 mt-1">Your orders will appear here</p>
          </div>
        ) : (
          <div className="xl:grid xl:grid-cols-[420px_1fr] xl:gap-6 space-y-3 xl:space-y-0">
            {/* Left: list */}
            <div className="space-y-3">
              {data.items.map((order: Order) => (
                <div
                  id={`order-${order.id}`}
                  key={order.id}
                  onClick={() => {
                    if (isWide()) {
                      // very wide screens: route-aware split — update URL so selection is shareable/bookmarkable
                      navigate(`/shop/orders/${order.id}`);
                    } else if (isDesktop()) {
                      // regular desktop: navigate to dedicated detail page
                      navigate(`/shop/orders/${order.id}`);
                    } else {
                      // mobile: open bottom sheet
                      setSelectedOrder(order);
                    }
                  }}
                  className={`bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-4 cursor-pointer active:scale-[0.99] transition-all ${routeOrderId === order.id ? 'ring-2 ring-orange-200 bg-orange-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${statusColor(order.status)}`}>{order.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{formatDate(order.orderDate)} &bull; {order.items?.length || 0} items</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  {order.status === 'Delivered' && !(routeOrderId === order.id && isDesktop()) && (
                    <div className="mt-3 pt-3 border-t border-slate-50">
                      <button
                        onClick={(e) => { e.stopPropagation(); reorderMut.mutate(order.id); }}
                        className="flex items-center justify-center gap-1.5 w-full py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-semibold hover:bg-orange-100 active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reorder
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {data.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-slate-400 font-medium">Page {page} of {data.totalPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl disabled:opacity-40 shadow-sm">Previous</button>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages} className="px-4 py-2 text-xs font-medium bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl disabled:opacity-40 shadow-sm">Next</button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: inline detail (wide screens) */}
            <div className="hidden xl:block" ref={detailPanelRef}>
              {/* If route has :id render the nested route (CustomerOrderDetail) via Outlet, otherwise fall back to selectedOrder state */}
              {routeOrderId ? (
                <div className="slide-in-right-desktop">
                  <Outlet />
                </div>
              ) : selectedOrder ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 slide-in-right-desktop">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{selectedOrder.orderNumber}</h3>
                      <p className="text-xs text-slate-400">{formatDate(selectedOrder.orderDate)}</p>
                    </div>
                    <div className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${statusColor(selectedOrder.status)}`}>{selectedOrder.status}</div>
                  </div>

                  <div className="divide-y divide-slate-100 space-y-4">
                    <div>
                      <h4 className="text-xs text-slate-500 font-medium mb-2">Items</h4>
                      <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
                        {selectedOrder.items?.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3">
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
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Total</span>
                        <span className="text-lg font-bold text-orange-600">{formatCurrency(selectedOrder.totalAmount)}</span>
                      </div>
                    </div>

                    <div>
                      {selectedOrder.status === 'Pending' && (
                        <button onClick={() => cancelMut.mutate(selectedOrder.id)} className="w-full py-2 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50">Cancel Order</button>
                      )}

                      {selectedOrder.status === 'Delivered' && !selectedOrder.rating && (
                        <div className="bg-amber-50/50 rounded-xl p-3 mt-3">
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-5 h-5 ${s <= (selectedOrder.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => reorderMut.mutate(selectedOrder.id)} className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl">Reorder</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">Select an order to see details</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Bottom Sheet (mobile only) */}
      {selectedOrder && !isDesktop() && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => navigate('/shop/orders')} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up">
            {/* Sheet Handle */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 z-10">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">{selectedOrder.orderNumber}</h2>
                <button onClick={() => navigate('/shop/orders')} className="p-1.5 hover:bg-slate-100 rounded-xl transition">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Date</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDate(selectedOrder.orderDate)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Status</p>
                  <span className={`inline-block mt-1 text-[10px] px-2.5 py-1 rounded-full font-semibold ${statusColor(selectedOrder.status)}`}>{selectedOrder.status}</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-slate-900 text-sm mb-2">Items</h3>
                <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-orange-400" />
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
              <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-xl p-4 flex justify-between items-center">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-lg font-bold text-orange-600">{formatCurrency(selectedOrder.totalAmount)}</span>
              </div>

              {selectedOrder.status === 'Pending' && (
                <button
                  onClick={() => cancelMut.mutate(selectedOrder.id)}
                  className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all"
                >
                  Cancel Order
                </button>
              )}

              {/* Rating Section */}
              {selectedOrder.status === 'Delivered' && !selectedOrder.rating && (
                <div className="bg-amber-50/50 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-slate-900 text-sm">Rate this order</h3>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRatingVal(star)}
                        className="p-0.5 transition-transform active:scale-90"
                      >
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

              {selectedOrder.rating && (
                <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3">
                  <span className="text-xs text-slate-500 font-medium">Your Rating:</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= (selectedOrder.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.status === 'Delivered' && (
                <button
                  onClick={() => reorderMut.mutate(selectedOrder.id)}
                  disabled={reorderMut.isPending}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all"
                >
                  {reorderMut.isPending ? 'Reordering...' : 'Reorder'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
