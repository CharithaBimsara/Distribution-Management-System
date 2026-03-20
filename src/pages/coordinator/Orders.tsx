import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  ChevronRight,
  Eye,
  XCircle,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { ordersApi } from '../../services/api/ordersApi';
import { customersApi } from '../../services/api/customersApi';
import { coordinatorGetReps } from '../../services/api/coordinatorApi';
import type { Order, OrderStatus } from '../../types/order.types';
import { ORDER_STATUSES } from '../../types/order.types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import MobileTileList from '../../components/common/MobileTileList';
import StatusBadge from '../../components/common/StatusBadge';

const statusOptions: (OrderStatus | '')[] = ['', ...ORDER_STATUSES];
const selectCls =
  'px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer';

export default function CoordinatorOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [repIdFilter, setRepIdFilter] = useState('');
  const [customerIdFilter, setCustomerIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const { data: repsData } = useQuery({
    queryKey: ['coordinator-reps-filter'],
    queryFn: () => coordinatorGetReps().then((r) => r || []),
    staleTime: 5 * 60 * 1000,
  });

  const { data: customersData } = useQuery({
    queryKey: ['coordinator-customers-filter'],
    queryFn: () => customersApi.coordinatorGetAll({ pageSize: 500 }).then((r) => r.data.data?.items || []),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['coordinator-orders', page, status, fromDate, toDate, repIdFilter, customerIdFilter],
    queryFn: () =>
      ordersApi
        .coordinatorGetAll({
          page,
          pageSize: 20,
          status: status || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          repId: repIdFilter || undefined,
          customerId: customerIdFilter || undefined,
        })
        .then((r) => r.data.data),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => ordersApi.coordinatorApprove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-orders'] });
      toast.success('Order approved');
    },
    onError: () => toast.error('Failed to approve order'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersApi.coordinatorReject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-orders'] });
      toast.success('Order rejected');
    },
    onError: () => toast.error('Failed to reject order'),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: OrderStatus }) =>
      ordersApi.coordinatorUpdateStatus(id, { status: nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-orders'] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update order status'),
  });

  const items: Order[] = (data?.items || []).filter((o: Order) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
  });

  const reps: { id: string; fullName: string }[] = (repsData || []).map((r) => ({
    id: r.id,
    fullName: r.fullName,
  }));
  const customers: { id: string; shopName: string }[] = customersData || [];

  const hasActiveFilters = !!(status || repIdFilter || customerIdFilter || fromDate || toDate || search);
  const clearFilters = () => {
    setStatus('');
    setRepIdFilter('');
    setCustomerIdFilter('');
    setFromDate('');
    setToDate('');
    setSearch('');
    setPage(1);
  };

  const handleRowClick = (order: Order) => {
    setExpandedOrderId((prev) => (prev === order.id ? null : order.id));
  };

  const handleReject = (orderId: string) => {
    const reason = window.prompt('Enter rejection reason');
    if (!reason || !reason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    rejectMut.mutate({ id: orderId, reason: reason.trim() });
  };

  const colCount = 8;

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Track orders from customers assigned to your team</p>
      </div>

      <div className="sticky top-0 z-30">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.10)] px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 min-w-[180px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search order # or customer"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderStatus | '');
                setPage(1);
              }}
              className={selectCls}
            >
              <option value="">All Statuses</option>
              {statusOptions.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={repIdFilter}
              onChange={(e) => {
                setRepIdFilter(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            >
              <option value="">All Reps</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>

            <select
              value={customerIdFilter}
              onChange={(e) => {
                setCustomerIdFilter(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shopName}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {isDesktop ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading orders</div>
          ) : items.length === 0 ? (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Rep</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((order) => (
                  <Fragment key={order.id}>
                    <tr
                      onClick={() => handleRowClick(order)}
                      className={`border-b border-slate-50 cursor-pointer transition-colors ${
                        expandedOrderId === order.id
                          ? 'bg-blue-50/50 border-blue-100'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-3 py-3.5 w-8">
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            expandedOrderId === order.id ? 'rotate-90 text-blue-500' : ''
                          }`}
                        />
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
                      <td className="px-4 py-3.5 text-sm text-slate-700">{order.customerName}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{order.repName || ''}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3.5 text-center text-sm text-slate-500">{order.items?.length || 0}</td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={order.status} /></td>
                    </tr>

                    {expandedOrderId === order.id && (
                      <tr className="border-b border-blue-100">
                        <td colSpan={colCount} className="p-0">
                          <div
                            className="bg-gradient-to-b from-blue-50/70 to-slate-50/20 px-8 py-5"
                            style={{ animation: 'fadeIn 0.18s ease-out both' }}
                          >
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-semibold text-slate-700">{order.orderNumber}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">{order.customerName}</span>
                                {order.deliveryAddress && (
                                  <>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-xs text-slate-400 truncate max-w-[240px]">{order.deliveryAddress}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={() => navigate(`/coordinator/orders/${order.id}`)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Full Details
                                </button>
                                {order.status === 'Pending' ? (
                                  <>
                                    <button
                                      onClick={() => approveMut.mutate(order.id)}
                                      disabled={approveMut.isPending || rejectMut.isPending}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-60"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                                    </button>
                                    <button
                                      onClick={() => handleReject(order.id)}
                                      disabled={approveMut.isPending || rejectMut.isPending}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition disabled:opacity-60"
                                    >
                                      <XCircle className="w-3.5 h-3.5" /> Reject
                                    </button>
                                  </>
                                ) : (
                                  <select
                                    value={order.status}
                                    onChange={(e) => {
                                      const nextStatus = e.target.value as OrderStatus;
                                      if (!nextStatus || nextStatus === order.status) return;
                                      updateStatusMut.mutate({ id: order.id, nextStatus });
                                    }}
                                    disabled={updateStatusMut.isPending}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600"
                                  >
                                    {ORDER_STATUSES.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>

                            {order.items && order.items.length > 0 && (
                              <div className="rounded-xl overflow-hidden border border-blue-100/80 mb-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-100/80">
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</th>
                                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax Amt</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Line Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {order.items.map((item, i) => (
                                      <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                        <td className="px-4 py-2.5 text-center text-xs text-slate-400 font-medium">{i + 1}</td>
                                        <td className="px-4 py-2.5 font-medium text-slate-900">{item.productName}</td>
                                        <td className="px-4 py-2.5 text-slate-400 text-xs">{item.productSKU || ''}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-700">{item.quantity}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-500">
                                          {item.taxAmount ? formatCurrency(item.taxAmount) : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="flex justify-end">
                              <div className="w-60 space-y-1.5 text-sm bg-white border border-slate-100 rounded-xl p-4">
                                <div className="flex justify-between text-slate-500">
                                  <span>Subtotal</span>
                                  <span>{formatCurrency(order.subTotal)}</span>
                                </div>
                                {order.discountAmount > 0 && (
                                  <div className="flex justify-between text-slate-500">
                                    <span>Discount</span>
                                    <span className="text-emerald-600">{formatCurrency(order.discountAmount)}</span>
                                  </div>
                                )}
                                {order.taxAmount > 0 && (
                                  <div className="flex justify-between text-slate-500">
                                    <span>Tax</span>
                                    <span>{formatCurrency(order.taxAmount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold text-base pt-2.5 border-t border-slate-200 text-indigo-700">
                                  <span>Total</span>
                                  <span>{formatCurrency(order.totalAmount)}</span>
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
              <span className="text-xs text-slate-500">
                {data.totalCount} total • page {data.page} of {data.totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <MobileTileList
          data={items}
          keyExtractor={(o) => o.id}
          onTileClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="No orders found"
          emptyIcon={<ShoppingCart className="w-10 h-10" />}
          page={data?.page}
          totalPages={data?.totalPages}
          onPageChange={setPage}
          renderTile={(order) => (
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{order.orderNumber}</p>
                  <p className="text-sm text-slate-500 truncate">{order.customerName}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                <span>{formatDate(order.orderDate)}</span>
                <span>Rep: {order.repName || ''}</span>
                <span>{order.items?.length || 0} items</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
                <p className="font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    expandedOrderId === order.id ? 'rotate-90 text-blue-500' : ''
                  }`}
                />
              </div>

              {expandedOrderId === order.id && (
                <div className="mt-3 pt-3 border-t border-blue-100 space-y-3 animate-fade-in">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs bg-slate-50 rounded-lg p-2.5">
                      <div>
                        <span className="font-medium text-slate-800">{item.productName}</span>
                        <span className="text-slate-400 ml-1">{item.quantity}</span>
                        {item.productSKU && <span className="text-slate-400 ml-1 text-[10px]">({item.productSKU})</span>}
                      </div>
                      <span className="font-semibold">{formatCurrency(item.lineTotal)}</span>
                    </div>
                  ))}

                  <div className="text-xs space-y-1.5 bg-white border border-slate-100 rounded-xl p-3 mt-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.subTotal)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount</span>
                        <span>{formatCurrency(order.discountAmount)}</span>
                      </div>
                    )}
                    {order.taxAmount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Tax</span>
                        <span>{formatCurrency(order.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-indigo-700 pt-1.5 border-t border-slate-100">
                      <span>Total</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      onClick={() => navigate(`/coordinator/orders/${order.id}`)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 active:scale-95"
                    >
                      View
                    </button>
                    {order.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => approveMut.mutate(order.id)}
                          disabled={approveMut.isPending || rejectMut.isPending}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 active:scale-95 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(order.id)}
                          disabled={approveMut.isPending || rejectMut.isPending}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-700 active:scale-95 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <select
                        value={order.status}
                        onChange={(e) => {
                          const nextStatus = e.target.value as OrderStatus;
                          if (!nextStatus || nextStatus === order.status) return;
                          updateStatusMut.mutate({ id: order.id, nextStatus });
                        }}
                        disabled={updateStatusMut.isPending}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-600"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
