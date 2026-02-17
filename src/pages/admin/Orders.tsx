import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { ShoppingCart, Eye, CheckCircle, XCircle, ChevronDown, X, RefreshCw, Sliders, Search, Trash2 } from 'lucide-react';
import type { Order } from '../../types/order.types';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/common/ConfirmModal';

const statusOptions = ['', 'Pending', 'Approved', 'Processing', 'Dispatched', 'Delivered', 'Cancelled', 'Rejected'];
const progressStatuses = ['Processing', 'Dispatched', 'Delivered'];

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState<Order | null>(null);
  const [statusPickerValue, setStatusPickerValue] = useState('');
  const [showRejectConfirmOrder, setShowRejectConfirmOrder] = useState<Order | null>(null);
  const [showDeleteConfirmOrder, setShowDeleteConfirmOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Desktop inline status menu
  const [desktopStatusMenuOrderId, setDesktopStatusMenuOrderId] = useState<string | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!desktopStatusMenuOrderId) return;
    function onDocClick(e: MouseEvent) {
      if (!statusMenuRef.current) return;
      if (e.target instanceof Node && statusMenuRef.current.contains(e.target)) return;
      setDesktopStatusMenuOrderId(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDesktopStatusMenuOrderId(null);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [desktopStatusMenuOrderId]);

  useEffect(() => {
    if (showStatusSheet) setStatusPickerValue(showStatusSheet.status || '');
  }, [showStatusSheet]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, status, fromDate, toDate],
    queryFn: () => ordersApi.adminGetAll({ page, pageSize: 20, status: status || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined }).then(r => r.data.data),
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
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search order # or customer..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none" />
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div className="relative"><select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="appearance-none pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white">
              <option value="">All Statuses</option>{statusOptions.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div>

            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />

            <button onClick={() => { setStatus(''); setFromDate(''); setToDate(''); setSearch(''); setPage(1); }} className="px-3 py-2 text-sm bg-slate-50 border border-slate-100 rounded-lg text-slate-600">Clear</button>
          </div>

          <div className="flex items-center gap-2 lg:hidden ml-auto">
            <button onClick={() => setShowFilterSheet(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700"><Sliders className="w-4 h-4" /> Filters</button>
            <button onClick={() => { setStatus(''); setFromDate(''); setToDate(''); setSearch(''); setPage(1); }} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600">Clear</button>
          </div>
        </div>
      </div>

      {showFilterSheet && (
        <OrderFilterSheet
          status={status}
          fromDate={fromDate}
          toDate={toDate}
          search={search}
          onClose={() => setShowFilterSheet(false)}
          setStatus={v => { setStatus(v); setPage(1); }}
          setFromDate={v => { setFromDate(v); setPage(1); }}
          setToDate={v => { setToDate(v); setPage(1); }}
          setSearch={v => { setSearch(v); setPage(1); }}
          clear={() => { setStatus(''); setFromDate(''); setToDate(''); setSearch(''); setPage(1); setShowFilterSheet(false); }}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        {isLoading ? <div className="p-8 text-center text-slate-500">Loading orders...</div> : !data?.items?.length ? (
          <div className="p-8 text-center"><ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No orders found</p></div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="lg:hidden divide-y divide-slate-100">
              { (data.items.filter(o => (search ? (o.orderNumber + ' ' + o.customerName).toLowerCase().includes(search.toLowerCase()) : true))).map((order: Order) => (
                <div key={order.id} className="p-3 flex items-center gap-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{order.orderNumber} — {order.customerName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.orderDate)}</p>
                        <div className="mt-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(order.status)}`}>{order.status}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                        <p className={`text-xs mt-1 font-medium ${order.items?.length <= 1 ? 'text-amber-600' : 'text-slate-500'}`}>{order.items?.length || 0} items</p>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-100" />

                    <div className="mt-2 grid grid-cols-4 gap-2">
                      <button onClick={() => setSelectedOrder(order)} className="w-full h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 transition"><Eye className="w-3 h-3" /> <span>View</span></button>

                      <button onClick={() => setShowStatusSheet(order)} className="w-full h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 transition"><ChevronDown className="w-3 h-3" /> <span>Status</span></button>

                      {order.status === 'Pending' ? (
                        <button onClick={() => setShowRejectConfirmOrder(order)} className="w-full h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 transition"><XCircle className="w-3 h-3" /> <span>Reject</span></button>
                      ) : order.status === 'Rejected' ? (
                        <button disabled className="w-full h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-100 opacity-80 cursor-not-allowed"><XCircle className="w-3 h-3" /> <span>Rejected</span></button>
                      ) : (
                        <div />
                      )}

                      <button onClick={() => setShowDeleteConfirmOrder(order)} className="w-full h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 transition"><Trash2 className="w-3 h-3" /> <span>Delete</span></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/table (unchanged) */}
            <div className="hidden lg:block overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Order #</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Items</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              { (data.items.filter(o => (search ? (o.orderNumber + ' ' + o.customerName).toLowerCase().includes(search.toLowerCase()) : true))).map((order: Order) => (
                <tr key={order.id} className="hover:bg-slate-50/60 transition-all duration-150">
                  <td className="px-4 py-3 font-medium text-slate-900">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{order.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(order.orderDate)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{order.items?.length || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-2 px-2 lg:px-3 py-0.5 lg:py-1 rounded-full text-xs lg:text-sm font-semibold ${statusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => navigate(`/admin/orders/${order.id}`)} className="px-2 py-1 text-xs lg:text-sm rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 flex items-center gap-2"><Eye className="w-4 h-4 text-slate-600" /> <span className="hidden lg:inline">View</span></button>

                      <div className="relative">
                        <button onClick={() => setDesktopStatusMenuOrderId(desktopStatusMenuOrderId === order.id ? null : order.id)} className="px-2 py-1 text-xs lg:text-sm rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 flex items-center gap-2">
                          <ChevronDown className="w-4 h-4 text-slate-600" /> <span className="hidden lg:inline">Status</span>
                        </button>

                        {desktopStatusMenuOrderId === order.id && (
                          <div ref={statusMenuRef} className="absolute right-0 mt-2 w-44 bg-white border border-slate-100 rounded-lg shadow-lg z-50 py-1">
                            {statusOptions.filter(Boolean).map(s => (
                              <button
                                key={s}
                                onClick={() => { updateStatusMut.mutate({ id: order.id, status: s }); setDesktopStatusMenuOrderId(null); }}
                                disabled={s === order.status}
                                className={`w-full text-left px-3 py-2 text-sm ${s === order.status ? 'text-slate-400' : 'hover:bg-slate-50 text-slate-700'}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-4 h-4 ${s === order.status ? 'text-emerald-500' : 'opacity-0'}`}><CheckCircle className="w-4 h-4" /></span>
                                  <span className={`${s === order.status ? 'font-semibold' : ''}`}>{s}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody></table></div>

            {data.totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200"><p className="text-sm text-slate-500">Page {data.page} of {data.totalPages} ({data.totalCount} orders)</p><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50">Previous</button><button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50">Next</button></div></div>}
          </>
        )}
      </div>

      {/* Order Detail (responsive): centered on desktop, bottom‑sheet on mobile */}
      {selectedOrder && (
        (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) ? (
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
        ) : (
          createPortal(
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedOrder(null)} />
              <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
                <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
                  <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 text-lg">Order {selectedOrder.orderNumber}</h2>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
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
                </div>
              </div>
            </div>,
            document.body
          )
        )
      )}

      {showStatusSheet && (
        (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowStatusSheet(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Change status</h2>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={statusPickerValue} onChange={e => setStatusPickerValue(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white">
                  {statusOptions.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="flex gap-3 mt-2">
                  <button onClick={() => setShowStatusSheet(null)} className="flex-1 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600">Cancel</button>
                  <button disabled={!statusPickerValue || statusPickerValue === showStatusSheet?.status} onClick={() => { if (!showStatusSheet) return; updateStatusMut.mutate({ id: showStatusSheet.id, status: statusPickerValue }); setShowStatusSheet(null); }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">Update</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          createPortal(
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowStatusSheet(null)} />
              <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
                <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
                  <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 text-lg">Change status</h2>
                    <button onClick={() => setShowStatusSheet(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={statusPickerValue} onChange={e => setStatusPickerValue(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white">
                    {statusOptions.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setShowStatusSheet(null)} className="flex-1 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600">Cancel</button>
                    <button disabled={!statusPickerValue || statusPickerValue === showStatusSheet?.status} onClick={() => { if (!showStatusSheet) return; updateStatusMut.mutate({ id: showStatusSheet.id, status: statusPickerValue }); setShowStatusSheet(null); }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">Update</button>
                  </div>
                </div>
              </div>
            </div>, document.body
          )
        )
      )}

      {showDeleteConfirmOrder && (
        (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) ? (
          <ConfirmModal
            open={true}
            title="Delete order"
            description={`Are you sure you want to delete order ${showDeleteConfirmOrder.orderNumber}? This action cannot be undone.`}
            confirmLabel="Delete"
            confirmVariant="orange"
            onConfirm={() => { setShowDeleteConfirmOrder(null); toast.success('Order deleted'); queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); }}
            onCancel={() => setShowDeleteConfirmOrder(null)}
          />
        ) : (
          createPortal(
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowDeleteConfirmOrder(null)} />
              <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[40vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
                <div className="sticky top-0 bg-white pt-3 pb-3 px-6 border-b border-slate-100 z-10">
                  <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 text-lg">Delete order</h2>
                    <button onClick={() => setShowDeleteConfirmOrder(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-500">Are you sure you want to delete order {showDeleteConfirmOrder.orderNumber}? This action cannot be undone.</p>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setShowDeleteConfirmOrder(null)} className="flex-1 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600">Cancel</button>
                    <button onClick={() => { setShowDeleteConfirmOrder(null); toast.success('Order deleted'); queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); }} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm">Delete</button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        )
      )}

      {showRejectConfirmOrder && (
        (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) ? (
          <ConfirmModal
            open={true}
            title="Reject order"
            description={`Are you sure you want to reject order ${showRejectConfirmOrder.orderNumber}?`}
            confirmLabel="Reject"
            confirmVariant="indigo"
            onConfirm={() => { if (showRejectConfirmOrder) rejectMut.mutate(showRejectConfirmOrder.id); setShowRejectConfirmOrder(null); }}
            onCancel={() => setShowRejectConfirmOrder(null)}
          />
        ) : (
          createPortal(
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowRejectConfirmOrder(null)} />
              <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[40vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
                <div className="sticky top-0 bg-white pt-3 pb-3 px-6 border-b border-slate-100 z-10">
                  <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 text-lg">Reject order</h2>
                    <button onClick={() => setShowRejectConfirmOrder(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-500">Are you sure you want to reject order {showRejectConfirmOrder.orderNumber}?</p>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setShowRejectConfirmOrder(null)} className="flex-1 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600">Cancel</button>
                    <button onClick={() => { if (showRejectConfirmOrder) rejectMut.mutate(showRejectConfirmOrder.id); setShowRejectConfirmOrder(null); }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm">Reject</button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        )
      )}
    </div>
  );
}

// Mobile order filter sheet (desktop shows inline filters)
function OrderFilterSheet({ status, fromDate, toDate, search, onClose, setStatus, setFromDate, setToDate, setSearch, clear }: { status: string; fromDate: string; toDate: string; search: string; onClose: () => void; setStatus: (v: string) => void; setFromDate: (v: string) => void; setToDate: (v: string) => void; setSearch: (v: string) => void; clear: () => void; }) {
  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
        <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg">Filters</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Order # or customer" className={inputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls + ' bg-white'}>
              <option value="">All Statuses</option>
              {statusOptions.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={clear} className="flex-1 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600">Clear</button>
            <button onClick={onClose} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm">Apply</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}