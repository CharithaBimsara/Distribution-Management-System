// @ts-nocheck
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../services/api/ordersApi';
import { customersApi } from '../../services/api/customersApi';
import { quickRequestApi } from '../../services/api/quickRequestApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ShoppingCart, Plus, ChevronRight, X, Download, FileSpreadsheet } from 'lucide-react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import StatusBadge from '../../components/common/StatusBadge';
import type { Order, OrderStatus } from '../../types/order.types';
import { downloadQuickRequestPdf, downloadQuickRequestExcel, downloadImage } from '../../utils/quickRequestPdf';

const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

const STATUS_PILLS = ['', 'Pending', 'Approved', 'Processing', 'Dispatched', 'Delivered'];

export default function RepOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [selectedQuick, setSelectedQuick] = useState<any>(null);
  const [quickLightbox, setQuickLightbox] = useState<string | null>(null);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const { data, isLoading } = useQuery({
    queryKey: ['rep-orders', page, status],
    queryFn: () => ordersApi.repGetAll({ page, pageSize: 20, status: status || undefined as OrderStatus | undefined }).then(r => r.data.data),
  });

  const { data: customersData } = useQuery({
    queryKey: ['rep-order-customer-names'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 2000 }).then((r) => r.data.data.items),
  });

  const orders = data?.items || [];
  const customerNameById = new Map((customersData || []).map((c) => [c.id, c.shopName]));
  const totalPages = data?.totalPages || (data ? Math.ceil(data.totalCount / data.pageSize) : 0);

  const { data: quickData = [] } = useQuery({
    queryKey: ['rep-quick-orders'],
    queryFn: () => quickRequestApi.repGetAll('Order').then(r => r.data.data),
  });

  const quickOrderRows = useMemo(() => (quickData as any[]).map((r: any) => ({
    _isQuick: true, _quick: r,
    id: r.id, orderNumber: r.requestNumber,
    customerName: r.customerName, repName: r.repName,
    orderDate: r.createdAt, status: r.status,
    items: [] as any[], totalAmount: 0, isFromApprovedQuotation: false,
  })), [quickData]);

  const allOrders: any[] = useMemo(() => {
    const merged = [...orders, ...quickOrderRows];
    return merged.sort((a, b) => {
      const ad = a.orderDate || '';
      const bd = b.orderDate || '';
      return bd < ad ? -1 : bd > ad ? 1 : 0;
    });
  }, [orders, quickOrderRows]);

  const mobilePendingCount = allOrders.filter((o) => o.status === 'Pending').length;
  const mobileTotalValue = allOrders.filter(o => !o._isQuick).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const getCustomerDisplayName = (order: Order) => {
    const fromCustomerList = customerNameById.get(order.customerId);
    if (fromCustomerList) return fromCustomerList;
    if (!order.customerName) return 'Customer';
    return order.customerName.includes('@') ? 'Customer' : order.customerName;
  };

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber', header: 'Order #',
      render: (o: any) => (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-800">{o.orderNumber}</span>
          {o._isQuick ? (
            <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">
              Quick Order
            </span>
          ) : o.isFromApprovedQuotation ? (
            <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Approved Quotation
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'customerName', header: 'Customer', className: 'w-[22%]', render: (o: any) => <span className="truncate block" title={o._isQuick ? o.customerName : getCustomerDisplayName(o)}>{o._isQuick ? o.customerName : getCustomerDisplayName(o)}</span> },
    { key: 'orderDate', header: 'Date', render: (o: any) => <span className="text-sm text-slate-500">{formatDate(o.orderDate)}</span> },
    { key: 'totalAmount', header: 'Total', className: 'w-[14%]', align: 'right' as const, render: (o: any) => o._isQuick ? <span className="text-slate-400">—</span> : <span className="font-semibold tabular-nums">{formatCurrency(o.totalAmount)}</span> },
    { key: 'items', header: 'Items', align: 'center' as const, render: (o: any) => o._isQuick ? <span className="text-slate-400">—</span> : (o.items?.length || 0) },
    { key: 'status', header: 'Status', className: 'w-[14%]', align: 'center' as const, render: (o: any) => <StatusBadge status={o.status} type="orders" /> },
  ];

  const handleRowClick = (o: any) => {
    if (o._isQuick) { setSelectedQuick(o._quick); return; }
    navigate(`/rep/orders/${o.id}`);
  };

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="My Orders" subtitle="Orders placed for customers"
        actions={[{ label: 'New Order', onClick: () => navigate('/rep/orders/new'), icon: Plus, variant: 'primary' as const }]} />

      {/* Status Filters */}
      {!isDesktop && (
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <SummaryMiniCard label="On This Page" value={String(orders.length)} />
          <SummaryMiniCard label="Pending" value={String(mobilePendingCount)} tone="amber" />
          <SummaryMiniCard label="Value" value={formatCurrency(mobileTotalValue)} tone="emerald" />
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_PILLS.map(s => (
          <button key={s} onClick={() => { setStatus(s as OrderStatus | ''); setPage(1); }}
            className={`px-4 md:px-4.5 py-2.5 md:py-2 rounded-xl text-xs md:text-[13px] font-semibold whitespace-nowrap transition ${
              status === s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}>{s || 'All'}</button>
        ))}
      </div>

      {isDesktop ? (
        <DataTable columns={columns} data={allOrders} isLoading={isLoading} keyExtractor={(o: any) => o.id}
          onRowClick={handleRowClick} emptyIcon={<ShoppingCart className="w-12 h-12 text-slate-300" />}
          emptyTitle="No orders found" emptyDescription="Try changing the filter"
          page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : (
        <MobileTileList data={allOrders} isLoading={isLoading} keyExtractor={(o: any) => o.id}
          onTileClick={handleRowClick} page={page} totalPages={totalPages} onPageChange={setPage}
          renderTile={(o: any) => {
            if (o._isQuick) {
              const qr = o._quick;
              return (
                <div className="rounded-2xl border border-violet-100 bg-white shadow-sm px-3.5 py-3.5 md:px-4 md:py-4">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm font-bold text-slate-800 truncate">{qr.requestNumber}</span>
                      <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">Quick Order</span>
                    </div>
                    <StatusBadge status={qr.status} type="orders" />
                  </div>
                  <p className="text-sm text-slate-700 truncate">{qr.customerName}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Date</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{formatDate(qr.createdAt)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Photos</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{qr.imageUrls?.length || 0}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <span className="text-xs font-semibold text-violet-600">Tap for details</span>
                  </div>
                </div>
              );
            }
            return (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-3.5 py-3.5 md:px-4 md:py-4">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm md:text-[15px] font-bold text-slate-800 truncate">{o.orderNumber}</span>
                  {o.isFromApprovedQuotation && (
                    <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Approved Quotation
                    </span>
                  )}
                </div>
                <StatusBadge status={o.status} type="orders" />
              </div>

              <p className="text-sm text-slate-700 truncate">{getCustomerDisplayName(o)}</p>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Date</p>
                  <p className="text-xs md:text-sm font-medium text-slate-700 mt-0.5">{formatDate(o.orderDate)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Amount</p>
                  <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5 truncate">{formatCurrency(o.totalAmount)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Items: {o.items?.length || 0}</span>
                <span className="text-xs font-semibold text-emerald-600">Tap for details</span>
              </div>
            </div>
            );
          }}
        />
      )}

      {/* Quick Order detail modal */}
      {selectedQuick && createPortal(
        <div className="fixed inset-0 z-[9998] bg-black/60 flex items-end md:items-center justify-center p-4" onClick={() => setSelectedQuick(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-base font-bold text-slate-900">{selectedQuick.requestNumber}</p>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">Quick Order</span>
              </div>
              <button onClick={() => setSelectedQuick(null)} className="p-2 rounded-full hover:bg-slate-100 transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Customer</p><p className="text-sm text-slate-800">{selectedQuick.customerName}</p></div>
                <div><p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Date</p><p className="text-sm text-slate-800">{formatDate(selectedQuick.createdAt)}</p></div>
                <div><p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Status</p><StatusBadge status={selectedQuick.status} type="orders" /></div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Order Details</p>
                <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans bg-slate-50 border border-slate-100 rounded-xl p-3">{selectedQuick.details}</pre>
              </div>
              {selectedQuick.adminNotes && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Admin Notes</p>
                  <p className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-xl p-3">{selectedQuick.adminNotes}</p>
                </div>
              )}
              {selectedQuick.imageUrls?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Photos ({selectedQuick.imageUrls.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuick.imageUrls.map((url: string, i: number) => (
                      <div key={i} className="relative group w-20 h-20">
                        <img src={`${BASE}${url}`} alt={`Photo ${i+1}`}
                          onClick={() => setQuickLightbox(`${BASE}${url}`)}
                          className="w-20 h-20 rounded-xl object-cover border border-slate-200 cursor-pointer hover:opacity-90 transition"
                          onError={e => { (e.target as any).style.display = 'none'; }}
                        />
                        <button
                          onClick={async e => { e.stopPropagation(); await downloadImage(`${BASE}${url}`, `photo-${i+1}`); }}
                          className="absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          title="Download photo"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
              <button onClick={() => downloadQuickRequestPdf(selectedQuick)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl text-red-600 hover:bg-red-50 border border-red-100 transition">
                <Download className="w-4 h-4" /> PDF
              </button>
              <button onClick={() => downloadQuickRequestExcel(selectedQuick)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl text-emerald-600 hover:bg-emerald-50 border border-emerald-100 transition">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {quickLightbox && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={() => setQuickLightbox(null)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2.5 hover:bg-white/25 transition" onClick={() => setQuickLightbox(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={quickLightbox} alt="Preview" className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
      )}
    </div>
  );
}

function SummaryMiniCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'amber' | 'emerald';
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-50 border-amber-100 text-amber-700'
      : tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
      : 'bg-white border-slate-200 text-slate-700';

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">{label}</p>
      <p className="text-sm md:text-base font-bold mt-0.5 truncate">{value}</p>
    </div>
  );
}
